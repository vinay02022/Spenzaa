import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DeliveryService } from './delivery.service.js';

@Injectable()
export class DeliveryCron {
  private readonly logger = new Logger(DeliveryCron.name);
  private running = false;

  constructor(private deliveryService: DeliveryService) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleRetries() {
    if (this.running) {
      return;
    }

    this.running = true;
    try {
      await this.deliveryService.processRetries();
    } catch (error) {
      this.logger.error('Retry cron failed', error);
    } finally {
      this.running = false;
    }
  }
}
