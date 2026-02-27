import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { EventBusService } from '../events/event-bus.service.js';

const MAX_ATTEMPTS = 5;
const BACKOFF_SCHEDULE_MS = [
  60_000,       // 1 minute
  300_000,      // 5 minutes
  900_000,      // 15 minutes
  3_600_000,    // 1 hour
];

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private prisma: PrismaService,
    private eventBus: EventBusService,
  ) {}

  async deliverEvent(eventId: string) {
    const event = await this.prisma.webhookEvent.findUnique({
      where: { id: eventId },
      include: { subscription: true },
    });

    if (!event || event.subscription.status !== 'ACTIVE') {
      return;
    }

    const attemptNumber = event.attempts + 1;

    await this.prisma.webhookEvent.update({
      where: { id: eventId },
      data: { status: 'PROCESSING', attempts: attemptNumber },
    });

    try {
      const response = await fetch(event.subscription.callbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event-Id': event.id,
          'X-Webhook-Subscription-Id': event.subscriptionId,
          ...(event.eventType ? { 'X-Webhook-Event-Type': event.eventType } : {}),
          ...(event.subscription.secret
            ? { 'X-Webhook-Secret': event.subscription.secret }
            : {}),
        },
        body: JSON.stringify(event.payload),
        signal: AbortSignal.timeout(10_000),
      });

      const bodyText = await response.text().catch(() => '');
      const snippet = bodyText.substring(0, 500);

      if (response.ok) {
        await this.prisma.deliveryAttempt.create({
          data: {
            eventId,
            attemptNumber,
            status: 'SUCCESS',
            httpStatus: response.status,
            responseBodySnippet: snippet,
          },
        });

        await this.prisma.webhookEvent.update({
          where: { id: eventId },
          data: { status: 'DELIVERED', lastError: null },
        });

        this.logger.log(`Event ${eventId} delivered on attempt ${attemptNumber}`);

        this.eventBus.emit({
          type: 'event.delivered',
          userId: event.subscription.userId,
          data: {
            eventId,
            subscriptionId: event.subscriptionId,
            eventType: event.eventType,
            source: event.source,
            status: 'DELIVERED',
            attempts: attemptNumber,
            timestamp: new Date().toISOString(),
          },
        });
      } else {
        await this.recordFailure(event, attemptNumber, response.status, snippet, `HTTP ${response.status}`);
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      await this.recordFailure(event, attemptNumber, null, null, errMsg);
    }
  }

  private async recordFailure(
    event: { id: string; subscriptionId: string; eventType: string | null; source: string | null; subscription: { userId: string } },
    attemptNumber: number,
    httpStatus: number | null,
    responseSnippet: string | null,
    errorMessage: string,
  ) {
    const eventId = event.id;
    const nextRetryAt =
      attemptNumber < MAX_ATTEMPTS
        ? new Date(Date.now() + (BACKOFF_SCHEDULE_MS[attemptNumber - 1] ?? BACKOFF_SCHEDULE_MS[BACKOFF_SCHEDULE_MS.length - 1]))
        : null;

    await this.prisma.deliveryAttempt.create({
      data: {
        eventId,
        attemptNumber,
        status: 'FAILED',
        httpStatus,
        responseBodySnippet: responseSnippet,
        errorMessage,
        nextRetryAt,
      },
    });

    const newStatus = attemptNumber >= MAX_ATTEMPTS ? 'FAILED' : 'PROCESSING';

    await this.prisma.webhookEvent.update({
      where: { id: eventId },
      data: { status: newStatus, lastError: errorMessage },
    });

    if (nextRetryAt) {
      this.logger.warn(
        `Event ${eventId} delivery failed (attempt ${attemptNumber}/${MAX_ATTEMPTS}), next retry at ${nextRetryAt.toISOString()}`,
      );
    } else {
      this.logger.error(
        `Event ${eventId} delivery permanently failed after ${MAX_ATTEMPTS} attempts`,
      );
    }

    this.eventBus.emit({
      type: attemptNumber >= MAX_ATTEMPTS ? 'event.failed' : 'event.processing',
      userId: event.subscription.userId,
      data: {
        eventId,
        subscriptionId: event.subscriptionId,
        eventType: event.eventType,
        source: event.source,
        status: newStatus,
        attempts: attemptNumber,
        lastError: errorMessage,
        timestamp: new Date().toISOString(),
      },
    });
  }

  async processRetries() {
    const pendingRetries = await this.prisma.deliveryAttempt.findMany({
      where: {
        status: 'FAILED',
        nextRetryAt: { lte: new Date() },
        event: { status: 'PROCESSING' },
      },
      include: { event: true },
      orderBy: { nextRetryAt: 'asc' },
      take: 10,
    });

    const processedEventIds = new Set<string>();

    for (const attempt of pendingRetries) {
      if (processedEventIds.has(attempt.eventId)) continue;
      processedEventIds.add(attempt.eventId);

      // Clear nextRetryAt to prevent duplicate processing
      await this.prisma.deliveryAttempt.update({
        where: { id: attempt.id },
        data: { nextRetryAt: null },
      });

      await this.deliverEvent(attempt.eventId);
    }

    if (processedEventIds.size > 0) {
      this.logger.log(`Processed ${processedEventIds.size} retry deliveries`);
    }
  }
}
