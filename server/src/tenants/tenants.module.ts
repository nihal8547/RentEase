import {
  Module,
  Injectable,
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtAuthGuard, CurrentUser, RequirePermission, PermissionGuard } from '../auth/auth.module.js';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async findAll(agencyId: string, query: any = {}) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const where: any = { agencyId };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const nationalityId = query['filter[nationalityListItemId]'] || query.nationalityListItemId;
    if (nationalityId) {
      where.nationalityListItemId = nationalityId;
    }

    const orderBy: any = {};
    if (query.sort) {
      const [field, dir] = query.sort.split(':');
      orderBy[field] = dir?.toLowerCase() === 'desc' ? 'desc' : 'asc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        include: {
          leases: {
            include: {
              unit: {
                include: { property: true },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
          documents: true,
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.tenant.count({ where }),
    ]);

    // Fetch nationality labels
    const natIds = [...new Set(tenants.map((t) => t.nationalityListItemId).filter(Boolean))];
    const natItems = await this.prisma.listItem.findMany({
      where: { id: { in: natIds as string[] } },
    });
    const natMap = new Map(natItems.map((n) => [n.id, n.label]));

    const data = tenants.map((t) => {
      const activeLease = t.leases.find((l) => l.status === 'ACTIVE') || t.leases[0];
      return {
        id: t.id,
        name: t.name,
        fullName: t.name,
        email: t.email,
        phone: t.phone,
        nationalityListItemId: t.nationalityListItemId,
        nationality: natMap.get(t.nationalityListItemId || '') || 'Qatari',
        unitNumber: activeLease?.unit?.unitNumber || 'Unassigned',
        propertyName: activeLease?.unit?.property?.name || 'Unassigned',
        propertyArea: activeLease?.unit?.property?.area || 'Doha',
        leaseStart: activeLease?.startDate ? activeLease.startDate.toISOString().slice(0, 10) : '2025-10-01',
        leaseEnd: activeLease?.endDate ? activeLease.endDate.toISOString().slice(0, 10) : '2026-09-28',
        rentQar: activeLease ? Number(activeLease.rentAmount) : 0,
        status: activeLease?.status || 'ACTIVE',
        documents: t.documents.map((d) => d.fileName),
        documentsList: t.documents,
      };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(agencyId: string, data: any) {
    return this.prisma.tenant.create({
      data: {
        agencyId,
        name: data.name || data.fullName,
        email: data.email,
        phone: data.phone,
        nationalityListItemId: data.nationalityListItemId,
      },
    });
  }

  async findOne(id: string, agencyId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id, agencyId },
      include: {
        leases: {
          include: {
            unit: { include: { property: true } },
            payments: { orderBy: { dueDate: 'desc' } },
            renewalRequests: true,
          },
        },
        documents: true,
        maintenanceRequests: {
          include: { unit: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!tenant) throw new NotFoundException('Tenant not found.');
    return tenant;
  }
}

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private service: TenantsService) {}

  @Get()
  @RequirePermission('tenants:view')
  async getTenants(@CurrentUser() user: any, @Query() query: any) {
    return this.service.findAll(user.agencyId, query);
  }

  @Post()
  @RequirePermission('tenants:create')
  async createTenant(@CurrentUser() user: any, @Body() body: any) {
    return this.service.create(user.agencyId, body);
  }

  @Get(':id')
  @RequirePermission('tenants:view')
  async getTenant(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user.agencyId);
  }
}

@Module({
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
