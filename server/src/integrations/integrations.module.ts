import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service.js';
import { IntegrationsController } from './integrations.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { EncryptionService } from './encryption.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, EncryptionService],
  exports: [IntegrationsService, EncryptionService],
})
export class IntegrationsModule {}
