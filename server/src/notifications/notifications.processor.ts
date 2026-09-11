import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service.js';

@Processor('notifications')
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);
    
    switch (job.name) {
      case 'dispatch-notification': {
        const { eventType, agencyId, recipientUserId, variables } = job.data;
        this.logger.log(`Dispatching ${eventType} for user ${recipientUserId}`);
        
        // 1. Fetch preferences for this user (check if enabled for email/whatsapp/in-app)
        const prefs = await this.prisma.notificationPreference.findMany({
          where: { userId: recipientUserId, eventType },
        });

        // 2. Fetch template for eventType
        const template = await this.prisma.notificationTemplate.findFirst({
          where: { agencyId, eventType },
        });

        let body = template?.bodyTemplate || `New notification: ${eventType}`;
        for (const [key, value] of Object.entries(variables)) {
          body = body.replace(new RegExp(`{{${key}}}`, 'g'), value as string);
        }

        // 3. Always create IN_APP notification
        await this.prisma.notification.create({
          data: {
            agencyId,
            userId: recipientUserId,
            type: eventType,
            message: body,
            channel: 'IN_APP',
            templateId: template?.id,
          },
        });

        // 4. Send Email if preferred
        const emailPref = prefs.find(p => p.channel === 'EMAIL');
        if (!emailPref || emailPref.enabled) {
          this.logger.log(`Sending email for ${eventType}...`);
          // simulate sending email
        }

        // 5. Send WhatsApp if preferred
        const waPref = prefs.find(p => p.channel === 'WHATSAPP');
        if (!waPref || waPref.enabled) {
          this.logger.log(`Sending WhatsApp for ${eventType}...`);
          // simulate sending whatsapp
        }
        
        break;
      }
    }
  }
}
