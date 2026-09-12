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
import { RedisService } from '../redis/redis.service.js';

@Injectable()
export class MaintenanceService {
  constructor(private prisma: PrismaService, private redis: RedisService) {}

  async getSummary(agencyId: string) {
    const cacheKey = `agency:${agencyId}:summary:maintenance`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const stats = await this.prisma.maintenanceRequest.groupBy({
      by: ['status'],
      _count: { _all: true },
      where: { unit: { property: { agencyId } } },
    });

    const total = stats.reduce((acc, curr) => acc + curr._count._all, 0);
    const open = stats.find(s => s.status === 'OPEN')?._count._all || 0;
    const inProgress = stats.find(s => s.status === 'IN_PROGRESS')?._count._all || 0;
    const resolved = stats.find(s => s.status === 'COMPLETED')?._count._all || 0;

    const result = { total, open, inProgress, resolved };
    await this.redis.set(cacheKey, result, 60);
    return result;
  }

  async findAll(agencyId: string, query: any = {}) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '50', 10)));
    const skip = (page - 1) * limit;

    const where: any = {
      unit: { property: { agencyId } },
    };

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { unit: { unitNumber: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const status = query['filter[status]'] || query.status;
    if (status) {
      where.status = status;
    }

    const priority = query['filter[priority]'] || query.priority;
    if (priority) {
      where.priority = priority;
    }

    const categoryId = query['filter[categoryListItemId]'] || query.categoryListItemId;
    if (categoryId) {
      where.categoryListItemId = categoryId;
    }

    const vendorId = query['filter[vendorId]'] || query.vendorId;
    if (vendorId) {
      where.vendorId = vendorId;
    }

    const orderBy: any = {};
    if (query.sort) {
      const [field, dir] = query.sort.split(':');
      orderBy[field] = dir?.toLowerCase() === 'desc' ? 'desc' : 'asc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [tickets, total] = await Promise.all([
      this.prisma.maintenanceRequest.findMany({
        where,
        include: {
          unit: { include: { property: true } },
          tenant: true,
          vendor: true,
          documents: true,
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.maintenanceRequest.count({ where }),
    ]);

    // Fetch category labels
    const catIds = [...new Set(tickets.map((t: any) => t.categoryListItemId).filter(Boolean))];
    const catItems = await this.prisma.listItem.findMany({
      where: { id: { in: catIds as string[] } },
    });
    const catMap = new Map(catItems.map((c: any) => [c.id, c.label]));

    const data = tickets.map((t: any) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      category: catMap.get(t.categoryListItemId || '') || 'HVAC',
      categoryListItemId: t.categoryListItemId,
      priority: t.priority,
      status: t.status,
      unitId: t.unitId,
      unitNumber: t.unit?.unitNumber,
      propertyName: t.unit?.property?.name,
      propertyArea: t.unit?.property?.area,
      unit: `${t.unit?.property?.name || 'Property'} - ${t.unit?.unitNumber || 'Unit'}`,
      tenantId: t.tenantId,
      tenantName: t.tenant?.name || 'Resident',
      tenantPhone: t.tenant?.phone,
      vendorId: t.vendorId,
      vendorName: t.vendor?.name || 'Unassigned',
      vendorPhone: t.vendor?.phone,
      reportedDate: t.createdAt.toISOString().slice(0, 10),
      createdAt: t.createdAt,
      documentsCount: t.documents.length,
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(agencyId: string, data: any) {
    const unit = await this.prisma.unit.findFirst({
      where: { id: data.unitId, property: { agencyId } },
    });
    if (!unit) throw new NotFoundException('Unit not found.');

    const req = await this.prisma.maintenanceRequest.create({
      data: {
        title: data.title,
        description: data.description || '',
        categoryListItemId: data.categoryListItemId,
        priority: data.priority || ('MEDIUM' as any),
        status: 'OPEN' as any,
        unitId: data.unitId,
        tenantId: data.tenantId,
        vendorId: data.vendorId || null,
      },
    });
    await this.redis.del(`agency:${agencyId}:summary:maintenance`);
    await this.redis.del(`agency:${agencyId}:kpis`);
    await this.redis.del(`agency:${agencyId}:reports:maintenance`);
    return req;
  }

  async update(id: string, agencyId: string, data: any) {
    const req = await this.prisma.maintenanceRequest.findFirst({
      where: { id, unit: { property: { agencyId } } },
    });
    if (!req) throw new NotFoundException('Maintenance request not found.');

    const updated = await this.prisma.maintenanceRequest.update({
      where: { id },
      data: {
        status: data.status,
        vendorId: data.vendorId,
        priority: data.priority,
        categoryListItemId: data.categoryListItemId,
        description: data.description,
      },
      include: { vendor: true, unit: true },
    });
    await this.redis.del(`agency:${agencyId}:summary:maintenance`);
    await this.redis.del(`agency:${agencyId}:kpis`);
    await this.redis.del(`agency:${agencyId}:reports:maintenance`);
    return updated;
  }
}

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('maintenance')
export class MaintenanceController {
  constructor(private service: MaintenanceService) {}

  @Get('summary')
  @RequirePermission('maintenance:view')
  async getSummary(@CurrentUser() user: any) {
    return this.service.getSummary(user.agencyId);
  }

  @Get()
  @RequirePermission('maintenance:view')
  async getTickets(@CurrentUser() user: any, @Query() query: any) {
    return this.service.findAll(user.agencyId, query);
  }

  @Post()
  @RequirePermission('maintenance:create')
  async createTicket(@CurrentUser() user: any, @Body() body: any) {
    return this.service.create(user.agencyId, body);
  }

  @Patch(':id')
  @RequirePermission('maintenance:edit')
  async updateTicket(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    return this.service.update(id, user.agencyId, body);
  }
}

@Module({
  controllers: [MaintenanceController],
  providers: [MaintenanceService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
