import { Module } from '@nestjs/common';
import { DeliveryService } from './delivery.service.js';
import { DeliveryCron } from './delivery.cron.js';

@Module({
  providers: [DeliveryService, DeliveryCron],
  exports: [DeliveryService],
})
export class DeliveryModule {}
