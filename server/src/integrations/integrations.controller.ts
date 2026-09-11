import { Controller, Get, Put, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { IntegrationsService } from './integrations.service.js';
import { JwtAuthGuard, RequirePermission, PermissionGuard } from '../auth/auth.module.js';
import { IntegrationProvider } from '@prisma/client';

@Controller('integrations')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get()
  @RequirePermission('settings:view')
  getAllIntegrations(@Request() req: any) {
    return this.integrationsService.getAllIntegrations(req.user.agencyId);
  }

  @Get(':provider')
  @RequirePermission('settings:view')
  getIntegration(@Request() req: any, @Param('provider') provider: IntegrationProvider) {
    return this.integrationsService.getIntegration(req.user.agencyId, provider);
  }

  @Put(':provider/config')
  @RequirePermission('settings:edit')
  configureIntegration(@Request() req: any, @Param('provider') provider: IntegrationProvider, @Body() config: any) {
    return this.integrationsService.configureIntegration(req.user.agencyId, provider, config);
  }

  @Post(':provider/test')
  @RequirePermission('settings:edit')
  testIntegration(@Request() req: any, @Param('provider') provider: IntegrationProvider) {
    return this.integrationsService.testIntegration(req.user.agencyId, provider);
  }

  @Delete(':provider')
  @RequirePermission('settings:edit')
  disconnectIntegration(@Request() req: any, @Param('provider') provider: IntegrationProvider) {
    return this.integrationsService.disconnectIntegration(req.user.agencyId, provider);
  }
}
