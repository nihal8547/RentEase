import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsService } from './notifications.service.js';
import { NotificationsController, NotificationTemplatesController, NotificationPreferencesController } from './notifications.controller.js';
import { NotificationsProcessor } from './notifications.processor.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  controllers: [NotificationsController, NotificationTemplatesController, NotificationPreferencesController],
  providers: [NotificationsService, NotificationsProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
