import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  public client: InstanceType<typeof PrismaClient>;
  private readonly logger = new Logger(PrismaService.name);

  constructor(private configService: ConfigService) {
    const connectionString = this.configService.get<string>('DATABASE_URL')!;
    const pool = new pg.Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    this.client = new PrismaClient({ adapter });
  }

  async onModuleInit() {
    try {
      await this.client.$connect();
      this.logger.log('Database connected');
    } catch (error) {
      this.logger.warn('Database connection failed — some features will be unavailable');
    }
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }

  get user() {
    return this.client.user;
  }

  get webhookSubscription() {
    return this.client.webhookSubscription;
  }

  get webhookEvent() {
    return this.client.webhookEvent;
  }

  get deliveryAttempt() {
    return this.client.deliveryAttempt;
  }

  get $transaction() {
    return this.client.$transaction.bind(this.client);
  }
}
