import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { validate } from './env.validation.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule, AuditInterceptor } from './auth/auth.module.js';
import { PropertiesModule } from './properties/properties.module.js';
import { TenantsModule } from './tenants/tenants.module.js';
import { LeasesModule } from './leases/leases.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { MaintenanceModule } from './maintenance/maintenance.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { ListTypesModule } from './list-types/list-types.module.js';
import { UsersModule } from './users/users.module.js';
import { RolesModule } from './roles/roles.module.js';
import { SupportingModule } from './supporting/supporting.module.js';
import { VendorsModule } from './vendors/vendors.module.js';
import { OperationsModule } from './operations/operations.module.js';
import { BillingModule } from './billing/billing.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { IntegrationsModule } from './integrations/integrations.module.js';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    ConfigModule.forRoot({ 
      isGlobal: true,
      validate,
    }),
    // Global rate limiter: 100 requests per 60 seconds per IP
    // Auth endpoints apply tighter limits via @UseGuards(ThrottlerGuard)
    ThrottlerModule.forRoot([
      {
        name: 'global',
        ttl: 60000,  // 60 seconds
        limit: 100,
      },
      {
        name: 'auth',
        ttl: 60000,  // 60 seconds
        limit: 5,    // Only 5 login/register attempts per minute per IP
      },
    ]),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    PrismaModule,
    AuthModule,
    PropertiesModule,
    TenantsModule,
    LeasesModule,
    PaymentsModule,
    MaintenanceModule,
    DashboardModule,
    ReportsModule,
    ListTypesModule,
    UsersModule,
    RolesModule,
    SupportingModule,
    VendorsModule,
    OperationsModule,
    BillingModule,
    NotificationsModule,
    IntegrationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
