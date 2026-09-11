import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect();
      console.log('Prisma connected to database successfully.');
    } catch (err) {
      console.warn('Database connection skipped or pending database startup:', err instanceof Error ? err.message : err);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
