import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateSubscriptionDto } from './dto/create-subscription.dto.js';
import { randomBytes } from 'crypto';

@Injectable()
export class WebhooksService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateSubscriptionDto) {
    const secret = randomBytes(32).toString('hex');

    return this.prisma.webhookSubscription.create({
      data: {
        sourceUrl: dto.sourceUrl,
        callbackUrl: dto.callbackUrl,
        eventTypes: dto.eventTypes ?? [],
        secret,
        userId,
      },
    });
  }

  async findAllByUser(userId: string) {
    return this.prisma.webhookSubscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancel(id: string, userId: string) {
    const subscription = await this.prisma.webhookSubscription.findUnique({
      where: { id },
    });

    if (!subscription || subscription.userId !== userId) {
      throw new NotFoundException('Subscription not found');
    }

    return this.prisma.webhookSubscription.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }
}
