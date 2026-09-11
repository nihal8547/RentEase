import { Controller, Get, Post, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { BillingService } from './billing.service.js';
import { JwtAuthGuard, RequirePermission, PermissionGuard } from '../auth/auth.module.js';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('billing:view')
  @Get('plan')
  getCurrentPlan(@Request() req: any) {
    return this.billingService.getCurrentPlan(req.user.agencyId);
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('billing:view')
  @Get('plans')
  getAllPlans() {
    return this.billingService.getAllPlans();
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('billing:edit')
  @Post('checkout-session')
  createCheckoutSession(@Request() req: any, @Body() dto: { planId: string; gateway: string }) {
    return this.billingService.createCheckoutSession(req.user.agencyId, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('billing:edit')
  @Post('change-plan')
  changePlan(@Request() req: any, @Body() dto: { planId: string }) {
    return this.billingService.changePlan(req.user.agencyId, dto.planId);
  }

  // Webhooks do not use JwtAuthGuard since they are called externally
  @Post('webhook/:gateway')
  handleWebhook(@Param('gateway') gateway: string, @Body() payload: any) {
    return this.billingService.handleWebhook(gateway, payload);
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('billing:edit')
  @Post('cancel')
  cancelSubscription(@Request() req: any) {
    return this.billingService.cancelSubscription(req.user.agencyId);
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('billing:view')
  @Get('invoices')
  getInvoices(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.billingService.getInvoices(
      req.user.agencyId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('billing:view')
  @Get('payment-methods')
  getPaymentMethods(@Request() req: any) {
    return this.billingService.getPaymentMethods(req.user.agencyId);
  }
}
