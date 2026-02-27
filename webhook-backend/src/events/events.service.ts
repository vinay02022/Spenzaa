import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DeliveryService } from '../delivery/delivery.service.js';
import { ReceiveEventDto } from './dto/receive-event.dto.js';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private prisma: PrismaService,
    private deliveryService: DeliveryService,
  ) {}

  async receive(subscriptionId: string, dto: ReceiveEventDto, headers: Record<string, string>) {
    const subscription = await this.prisma.webhookSubscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status !== 'ACTIVE') {
      throw new BadRequestException('Subscription is not active');
    }

    const event = await this.prisma.webhookEvent.create({
      data: {
        subscriptionId,
        payload: dto.payload as unknown as Prisma.InputJsonValue,
        eventType: dto.eventType ?? null,
        source: dto.source ?? null,
        headers: headers as unknown as Prisma.InputJsonValue,
        status: 'RECEIVED',
      },
    });

    // Fire-and-forget: attempt immediate delivery
    this.deliveryService.deliverEvent(event.id).catch((err) => {
      this.logger.error(`Failed to trigger delivery for event ${event.id}`, err);
    });

    return event;
  }

  async findAllByUser(userId: string, subscriptionId?: string) {
    const where: Record<string, unknown> = {
      subscription: { userId },
    };

    if (subscriptionId) {
      where.subscriptionId = subscriptionId;
    }

    return this.prisma.webhookEvent.findMany({
      where,
      include: {
        subscription: {
          select: { sourceUrl: true, callbackUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async findOne(id: string, userId: string) {
    const event = await this.prisma.webhookEvent.findUnique({
      where: { id },
      include: {
        subscription: {
          select: { sourceUrl: true, callbackUrl: true, userId: true },
        },
        deliveryAttempts: {
          orderBy: { attemptNumber: 'asc' },
        },
      },
    });

    if (!event || event.subscription.userId !== userId) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }
}
