import {
  Module,
  Injectable,
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtAuthGuard, CurrentUser, RequirePermission, PermissionGuard } from '../auth/auth.module.js';
import { PaymentStatus } from '@prisma/client';
import { RedisService } from '../redis/redis.service.js';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService, private redis: RedisService) {}

  async findAll(agencyId: string, query: any = {}) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const where: any = {
      lease: { unit: { property: { agencyId } } },
    };

    if (query.search) {
      where.OR = [
        { lease: { tenant: { name: { contains: query.search, mode: 'insensitive' } } } },
        { lease: { unit: { unitNumber: { contains: query.search, mode: 'insensitive' } } } },
      ];
    }

    const status = query['filter[status]'] || query.status;
    if (status) {
      where.status = status;
    }

    const methodId = query['filter[methodListItemId]'] || query.methodListItemId;
    if (methodId) {
      where.methodListItemId = methodId;
    }

    const propertyId = query['filter[propertyId]'] || query.propertyId;
    if (propertyId) {
      where.lease = { ...where.lease, unit: { propertyId } };
    }

    if (query.dateFrom || query.dateTo) {
      where.dueDate = {};
      if (query.dateFrom) where.dueDate.gte = new Date(query.dateFrom);
      if (query.dateTo) where.dueDate.lte = new Date(query.dateTo);
    }

    const orderBy: any = {};
    if (query.sort) {
      const [field, dir] = query.sort.split(':');
      orderBy[field] = dir?.toLowerCase() === 'desc' ? 'desc' : 'asc';
    } else {
      orderBy.dueDate = 'desc';
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          lease: {
            include: {
              tenant: true,
              unit: { include: { property: true } },
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    // Fetch method labels
    const methodIds = [...new Set(payments.map((p) => p.methodListItemId).filter(Boolean))];
    const methodItems = await this.prisma.listItem.findMany({
      where: { id: { in: methodIds as string[] } },
    });
    const methodMap = new Map(methodItems.map((m) => [m.id, m.label]));

    const data = payments.map((p) => ({
      id: p.id,
      invoiceNo: `INV-2026-${p.id.slice(0, 6).toUpperCase()}`,
      tenantName: p.lease?.tenant?.name || 'Resident',
      unitNumber: p.lease?.unit?.unitNumber || 'Unit',
      propertyName: p.lease?.unit?.property?.name || 'Property',
      amountQar: Number(p.amount),
      amount: Number(p.amount),
      dueDate: p.dueDate.toISOString().slice(0, 10),
      paidDate: p.paidDate?.toISOString().slice(0, 10) || null,
      method: methodMap.get(p.methodListItemId || '') || 'Fatora Gateway',
      methodListItemId: p.methodListItemId,
      status: p.status,
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSummary(agencyId: string) {
    const cacheKey = `agency:${agencyId}:summary:payments`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const stats = await this.prisma.payment.groupBy({
      by: ['status'],
      _sum: { amount: true },
      where: { lease: { unit: { property: { agencyId } } } },
    });

    const collectedQar = stats.find(s => s.status === 'PAID')?._sum.amount?.toNumber() || 0;
    const outstandingQar = stats.find(s => s.status === 'PENDING')?._sum.amount?.toNumber() || 0;
    const overdueQar = stats.find(s => s.status === 'OVERDUE')?._sum.amount?.toNumber() || 0;

    const result = { collectedQar, outstandingQar, overdueQar };
    await this.redis.set(cacheKey, result, 60);
    return result;
  }

  async markPaid(paymentId: string, agencyId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, lease: { unit: { property: { agencyId } } } },
    });
    if (!payment) throw new NotFoundException('Payment not found.');

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.PAID,
        paidDate: new Date(),
      },
    });
    await this.redis.del(`agency:${agencyId}:summary:payments`);
    await this.redis.del(`agency:${agencyId}:kpis`);
    await this.redis.del(`agency:${agencyId}:revenue-chart`);
    await this.redis.del(`agency:${agencyId}:reports:revenue`);
    return updated;
  }

  async create(agencyId: string, data: any) {
    const lease = await this.prisma.lease.findFirst({
      where: { id: data.leaseId, unit: { property: { agencyId } } },
    });
    if (!lease) throw new NotFoundException('Lease not found in this agency.');

    const p = await this.prisma.payment.create({
      data: {
        leaseId: data.leaseId,
        amount: data.amount,
        dueDate: new Date(data.dueDate),
        status: data.status || PaymentStatus.PENDING,
        methodListItemId: data.methodListItemId,
      },
    });
    await this.redis.del(`agency:${agencyId}:summary:payments`);
    await this.redis.del(`agency:${agencyId}:kpis`);
    await this.redis.del(`agency:${agencyId}:revenue-chart`);
    await this.redis.del(`agency:${agencyId}:reports:revenue`);
    return p;
  }
}

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private service: PaymentsService) {}

  @Get()
  @RequirePermission('payments:view')
  async getPayments(@CurrentUser() user: any, @Query() query: any) {
    return this.service.findAll(user.agencyId, query);
  }

  @Get('summary')
  @RequirePermission('payments:view')
  async getSummary(@CurrentUser() user: any) {
    return this.service.getSummary(user.agencyId);
  }

  @Patch(':id/mark-paid')
  @RequirePermission('payments:edit')
  async markPaid(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.markPaid(id, user.agencyId);
  }

  @Patch(':id')
  @RequirePermission('payments:edit')
  async updatePayment(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() _body: any,
  ) {
    return this.service.markPaid(id, user.agencyId);
  }

  @Post()
  @RequirePermission('payments:create')
  async recordPayment(@CurrentUser() user: any, @Body() body: any) {
    return this.service.create(user.agencyId, body);
  }
}

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
