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
import { UnitStatus, LeaseStatus } from '@prisma/client';

@Injectable()
export class LeasesService {
  constructor(private prisma: PrismaService) {}

  async findAll(agencyId: string, query: any = {}) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const where: any = {
      unit: { property: { agencyId } },
    };

    if (query.search) {
      where.OR = [
        { tenant: { name: { contains: query.search, mode: 'insensitive' } } },
        { unit: { unitNumber: { contains: query.search, mode: 'insensitive' } } },
        { unit: { property: { name: { contains: query.search, mode: 'insensitive' } } } },
      ];
    }

    const status = query['filter[status]'] || query.status;
    if (status) {
      where.status = status;
    }

    const propertyId = query['filter[propertyId]'] || query.propertyId;
    if (propertyId) {
      where.unit = { ...where.unit, propertyId };
    }

    if (query.expiringInDays) {
      const days = parseInt(query.expiringInDays, 10);
      const now = new Date();
      const future = new Date();
      future.setDate(now.getDate() + days);

      where.endDate = {
        gte: now,
        lte: future,
      };
      where.status = LeaseStatus.ACTIVE;
    }

    const orderBy: any = {};
    if (query.sort) {
      const [field, dir] = query.sort.split(':');
      orderBy[field] = dir?.toLowerCase() === 'desc' ? 'desc' : 'asc';
    } else {
      orderBy.endDate = 'asc';
    }

    const [leases, total] = await Promise.all([
      this.prisma.lease.findMany({
        where,
        include: {
          tenant: true,
          unit: { include: { property: true } },
          renewalRequests: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          documents: true,
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.lease.count({ where }),
    ]);

    const data = leases.map((l) => ({
      id: l.id,
      unitId: l.unitId,
      unitNumber: l.unit.unitNumber,
      propertyId: l.unit.propertyId,
      propertyName: l.unit.property.name,
      propertyArea: l.unit.property.area,
      tenantId: l.tenantId,
      tenantName: l.tenant.name,
      phone: l.tenant.phone,
      startDate: l.startDate.toISOString().slice(0, 10),
      endDate: l.endDate.toISOString().slice(0, 10),
      rentAmount: Number(l.rentAmount),
      rentQar: Number(l.rentAmount),
      status: l.status,
      latestRenewalRequest: l.renewalRequests[0] || null,
      documentsCount: l.documents.length,
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
    // Verify unit belongs to agency
    const unit = await this.prisma.unit.findFirst({
      where: { id: data.unitId, property: { agencyId } },
    });
    if (!unit) throw new NotFoundException('Unit not found in your agency.');

    const lease = await this.prisma.lease.create({
      data: {
        unitId: data.unitId,
        tenantId: data.tenantId,
        leaseTypeListItemId: data.leaseTypeListItemId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        rentAmount: data.rentAmount,
        status: LeaseStatus.ACTIVE,
      },
    });

    // Set unit to OCCUPIED
    await this.prisma.unit.update({
      where: { id: data.unitId },
      data: { status: UnitStatus.OCCUPIED },
    });

    return lease;
  }
}

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('leases')
export class LeasesController {
  constructor(private service: LeasesService) {}

  @Get()
  @RequirePermission('leases:view')
  async getLeases(@CurrentUser() user: any, @Query() query: any) {
    return this.service.findAll(user.agencyId, query);
  }

  @Post()
  @RequirePermission('leases:create')
  async createLease(@CurrentUser() user: any, @Body() body: any) {
    return this.service.create(user.agencyId, body);
  }
}

@Module({
  controllers: [LeasesController],
  providers: [LeasesService],
  exports: [LeasesService],
})
export class LeasesModule {}
