import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotifChannel } from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('notifications') private readonly notificationsQueue: Queue,
  ) {}

  async dispatch(
    eventType: string,
    agencyId: string,
    recipientUserId: string,
    variables: Record<string, string>,
  ) {
    this.logger.log(`Queueing dispatch for event: ${eventType}, user: ${recipientUserId}`);
    await this.notificationsQueue.add('dispatch-notification', {
      eventType,
      agencyId,
      recipientUserId,
      variables,
    });
  }

  async getUnreadInApp(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId, isRead: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(notificationId: string) {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async getTemplates(agencyId: string) {
    // In a real app, this would merge global defaults with agency overrides
    return this.prisma.notificationTemplate.findMany({
      where: { agencyId },
    });
  }

  async updateTemplate(id: string, bodyTemplate: string) {
    return this.prisma.notificationTemplate.update({
      where: { id },
      data: { bodyTemplate },
    });
  }

  async getPreferences(userId: string) {
    return this.prisma.notificationPreference.findMany({
      where: { userId },
    });
  }

  async updatePreferences(userId: string, preferences: { eventType: string; channel: NotifChannel; enabled: boolean }[]) {
    // Transaction to update all preferences
    return this.prisma.$transaction(
      preferences.map((pref) =>
        this.prisma.notificationPreference.upsert({
          where: {
            userId_eventType_channel: {
              userId,
              eventType: pref.eventType,
              channel: pref.channel,
            },
          },
          update: { enabled: pref.enabled },
          create: {
            userId,
            eventType: pref.eventType,
            channel: pref.channel,
            enabled: pref.enabled,
          },
        })
      )
    );
  }
}
