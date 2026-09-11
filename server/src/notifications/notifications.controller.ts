import { Controller, Get, Patch, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { JwtAuthGuard, RequirePermission, PermissionGuard } from '../auth/auth.module.js';
import { NotifChannel } from '@prisma/client';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  getUnread(@Request() req: any, @Query('unread') unread: string) {
    if (unread === 'true') {
      return this.notificationsService.getUnreadInApp(req.user.id);
    }
    // Implementation for all notifications omitted for brevity
    return [];
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }
}

@Controller('notification-templates')
export class NotificationTemplatesController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('settings:view')
  @Get()
  getTemplates(@Request() req: any) {
    return this.notificationsService.getTemplates(req.user.agencyId);
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('settings:edit')
  @Patch(':id')
  updateTemplate(@Param('id') id: string, @Body('bodyTemplate') bodyTemplate: string) {
    return this.notificationsService.updateTemplate(id, bodyTemplate);
  }
}

@Controller('notification-preferences')
export class NotificationPreferencesController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  getPreferences(@Request() req: any) {
    return this.notificationsService.getPreferences(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch()
  updatePreferences(@Request() req: any, @Body() body: { eventType: string; channel: NotifChannel; enabled: boolean }[]) {
    return this.notificationsService.updatePreferences(req.user.id, body);
  }
}
