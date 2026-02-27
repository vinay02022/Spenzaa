import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  Query,
  Headers,
  UnauthorizedException,
  Sse,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventsService } from './events.service.js';
import { EventBusService } from './event-bus.service.js';
import { ReceiveEventDto } from './dto/receive-event.dto.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { ParseUUIDPipe } from '../common/pipes/parse-uuid.pipe.js';
import type { JwtPayload } from '../auth/strategies/jwt.strategy.js';

interface AuthRequest {
  user: { userId: string; email: string };
}

interface MessageEvent {
  data: string;
  type?: string;
  id?: string;
}

@Controller()
export class EventsController {
  constructor(
    private eventsService: EventsService,
    private eventBus: EventBusService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  @Public()
  @Throttle({ short: { ttl: 1_000, limit: 10 }, medium: { ttl: 60_000, limit: 60 } })
  @Post('webhooks/:subscriptionId/receive')
  receive(
    @Param('subscriptionId', ParseUUIDPipe) subscriptionId: string,
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

  @Public()
  @SkipThrottle()
  @Sse('events/stream')
  stream(@Query('token') token: string): Observable<MessageEvent> {
    if (!token) {
      throw new UnauthorizedException('Missing token query parameter');
    }

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const userId = payload.sub;

    return this.eventBus.streamForUser(userId).pipe(
      map((evt) => ({
        type: evt.type,
        data: JSON.stringify(evt.data),
      })),
    );
  }

  @Get('events/:id')
  findOne(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.findOne(id, req.user.userId);
  }
}
