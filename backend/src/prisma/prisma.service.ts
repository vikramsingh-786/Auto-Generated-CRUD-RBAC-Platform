import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super();
    Logger.log(
      `DATABASE_URL used by Prisma: ${process.env.DATABASE_URL}`,
      'PrismaService',
    );
  }

  async onModuleInit() {
    this.logger.log('Connecting to the database...');
    try {
      await this.$connect();
      this.logger.log('Database connection successful.');
    } catch (error) {
      this.logger.error('Database connection failed.', error.stack);
      throw error;
    }
  }

  async onModuleDestroy() {
    this.logger.log('Disconnecting from the database...');
    await this.$disconnect();
  }
}