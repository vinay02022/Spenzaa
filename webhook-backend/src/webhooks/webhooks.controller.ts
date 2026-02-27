import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Req,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service.js';
import { CreateSubscriptionDto } from './dto/create-subscription.dto.js';

interface AuthRequest {
  user: { userId: string; email: string };
}

@Controller('webhooks')
export class WebhooksController {
  constructor(private webhooksService: WebhooksService) {}

  @Post('subscribe')
  create(@Req() req: AuthRequest, @Body() dto: CreateSubscriptionDto) {
    return this.webhooksService.create(req.user.userId, dto);
  }

  @Get()
  findAll(@Req() req: AuthRequest) {
    return this.webhooksService.findAllByUser(req.user.userId);
  }

  @Post(':id/cancel')
  cancelPost(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.webhooksService.cancel(id, req.user.userId);
  }

  @Delete(':id')
  cancel(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.webhooksService.cancel(id, req.user.userId);
  }
}
