import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';

import { PrismaService } from './prisma/prisma.service.js';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async getHealth() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'connected', timestamp: new Date() };
    } catch (e) {
      return { status: 'error', database: 'disconnected', timestamp: new Date() };
    }
  }
}
