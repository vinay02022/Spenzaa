import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  Query,
  Headers,
} from '@nestjs/common';
import { EventsService } from './events.service.js';
import { ReceiveEventDto } from './dto/receive-event.dto.js';
import { Public } from '../auth/decorators/public.decorator.js';

interface AuthRequest {
  user: { userId: string; email: string };
}

@Controller()
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @Public()
  @Post('webhooks/:subscriptionId/receive')
  receive(
    @Param('subscriptionId') subscriptionId: string,
    @Body() dto: ReceiveEventDto,
    @Headers() headers: Record<string, string>,
  ) {
    return this.eventsService.receive(subscriptionId, dto, headers);
  }

  @Get('events')
  findAll(
    @Req() req: AuthRequest,
    @Query('subscriptionId') subscriptionId?: string,
  ) {
    return this.eventsService.findAllByUser(req.user.userId, subscriptionId);
  }

  @Get('events/:id')
  findOne(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.eventsService.findOne(id, req.user.userId);
  }
}
