import { Global, Module } from '@nestjs/common';
import { EventsController } from './events.controller.js';
import { EventsService } from './events.service.js';
import { EventBusService } from './event-bus.service.js';
import { DeliveryModule } from '../delivery/delivery.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Global()
@Module({
  imports: [DeliveryModule, AuthModule],
  controllers: [EventsController],
  providers: [EventsService, EventBusService],
  exports: [EventsService, EventBusService],
})
export class EventsModule {}
