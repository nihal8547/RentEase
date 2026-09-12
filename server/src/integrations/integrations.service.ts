import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { IntegrationProvider } from '@prisma/client';
import { EncryptionService } from './encryption.service.js';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService
  ) {}


  private maskConfig(configJson: string): string {
    const config = JSON.parse(configJson);
    const masked: Record<string, string> = {};
    for (const [key, value] of Object.entries(config)) {
      const strVal = String(value);
      if (strVal.length > 4) {
        masked[key] = '*'.repeat(strVal.length - 4) + strVal.slice(-4);
      } else {
        masked[key] = '****';
      }
    }
    return JSON.stringify(masked);
  }

  async getAllIntegrations(agencyId: string) {
    const integrations = await this.prisma.integration.findMany({
      where: { agencyId },
    });

    return integrations.map(i => ({
      ...i,
      configJson: this.maskConfig(this.encryptionService.decrypt(i.configJson)),
    }));
  }

  async getIntegration(agencyId: string, provider: IntegrationProvider) {
    const integration = await this.prisma.integration.findUnique({
      where: { agencyId_provider: { agencyId, provider } },
    });

    if (!integration) {
      return null;
    }

    return {
      ...integration,
      configJson: this.maskConfig(this.encryptionService.decrypt(integration.configJson)),
    };
  }

  async configureIntegration(agencyId: string, provider: IntegrationProvider, config: any) {
    const encryptedConfig = this.encryptionService.encrypt(JSON.stringify(config));

    return this.prisma.integration.upsert({
      where: { agencyId_provider: { agencyId, provider } },
      update: { configJson: encryptedConfig },
      create: {
        agencyId,
        provider,
        configJson: encryptedConfig,
        status: 'NOT_CONFIGURED',
      },
    });
  }

  async testIntegration(agencyId: string, provider: IntegrationProvider) {
    const integration = await this.prisma.integration.findUnique({
      where: { agencyId_provider: { agencyId, provider } },
    });

    if (!integration) {
      throw new BadRequestException('Integration not configured');
    }

    const _config = JSON.parse(this.encryptionService.decrypt(integration.configJson));
    this.logger.log(`Testing integration ${provider} for agency ${agencyId}`);

    // In a real app, actually test the connection using the config values
    // Here we just mock a successful test
    const isSuccess = true; 

    return this.prisma.integration.update({
      where: { id: integration.id },
      data: {
        status: isSuccess ? 'CONNECTED' : 'ERROR',
        lastTestedAt: new Date(),
        lastError: isSuccess ? null : 'Mock connection failed',
      },
    });
  }

  async disconnectIntegration(agencyId: string, provider: IntegrationProvider) {
    return this.prisma.integration.delete({
      where: { agencyId_provider: { agencyId, provider } },
    });
  }
}
