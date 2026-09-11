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
import { BillingService, SupportingModule } from '../supporting/supporting.module.js';
import { UnitStatus } from '@prisma/client';

@Injectable()
export class PropertiesService {
  constructor(
    private prisma: PrismaService,
    private billingService: BillingService,
  ) {}

  async findAll(agencyId: string, query: any = {}) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const where: any = { agencyId };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { address: { contains: query.search, mode: 'insensitive' } },
        { area: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query['filter[area]'] || query.area) {
      where.area = query['filter[area]'] || query.area;
    }

    const orderBy: any = {};
    if (query.sort) {
      const [field, dir] = query.sort.split(':');
      orderBy[field] = dir?.toLowerCase() === 'desc' ? 'desc' : 'asc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [properties, total] = await Promise.all([
      this.prisma.property.findMany({
        where,
        include: {
          units: {
            include: {
              leases: {
                where: { status: 'ACTIVE' },
                include: { tenant: true },
              },
            },
          },
          _count: { select: { units: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.property.count({ where }),
    ]);

    // Calculate aggregated statistics per property
    const data = properties.map((p: any) => {
      const totalUnits = p.units.length;
      const occupiedUnits = p.units.filter((u: any) => u.status === UnitStatus.OCCUPIED).length;
      const monthlyRollQar = p.units
        .filter((u: any) => u.status === UnitStatus.OCCUPIED)
        .reduce((sum: number, u: any) => {
          const activeLease = u.leases[0];
          return sum + (activeLease ? Number(activeLease.rentAmount) : 0);
        }, 0);

      return {
        id: p.id,
        name: p.name,
        area: p.area,
        address: p.address,
        totalUnits,
        occupiedUnits,
        monthlyRollQar,
        units: p.units,
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

  async create(agencyId: string, data: { name: string; area: string; address: string }) {
    return this.prisma.property.create({
      data: {
        agencyId,
        name: data.name,
        area: data.area,
        address: data.address,
      },
    });
  }

  async findOne(id: string, agencyId: string) {
    const prop = await this.prisma.property.findFirst({
      where: { id, agencyId },
      include: {
        units: {
          include: {
            leases: {
              where: { status: 'ACTIVE' },
              include: { tenant: true },
            },
          },
        },
        expenses: true,
      },
    });
    if (!prop) throw new NotFoundException('Property not found.');
    return prop;
  }

  async findAllUnits(agencyId: string, query: any = {}) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '50', 10)));
    const skip = (page - 1) * limit;

    const where: any = {
      property: { agencyId },
    };

    if (query.search) {
      where.OR = [
        { unitNumber: { contains: query.search, mode: 'insensitive' } },
        { property: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    if (query['filter[status]'] || query.status) {
      where.status = query['filter[status]'] || query.status;
    }
    if (query['filter[unitTypeId]'] || query.unitTypeId) {
      where.unitTypeId = query['filter[unitTypeId]'] || query.unitTypeId;
    }
    if (query['filter[bedrooms]'] || query.bedrooms) {
      where.bedrooms = parseInt(query['filter[bedrooms]'] || query.bedrooms, 10);
    }

    const [units, total] = await Promise.all([
      this.prisma.unit.findMany({
        where,
        include: {
          property: { select: { id: true, name: true, area: true } },
          leases: {
            where: { status: 'ACTIVE' },
            include: { tenant: { select: { id: true, name: true, phone: true } } },
            take: 1,
          },
        },
        skip,
        take: limit,
      }),
      this.prisma.unit.count({ where }),
    ]);

    // Fetch list item labels for unitTypeId
    const unitTypeIds = [...new Set(units.map((u: any) => u.unitTypeId).filter(Boolean))];
    const typeItems = await this.prisma.listItem.findMany({
      where: { id: { in: unitTypeIds } },
    });
    const typeMap = new Map(typeItems.map((t: any) => [t.id, t.label]));

    const data = units.map((u: any) => ({
      id: u.id,
      unitNumber: u.unitNumber,
      floor: u.floor,
      bedrooms: u.bedrooms,
      bathrooms: u.bathrooms,
      sizeSqm: Number(u.sizeSqm),
      status: u.status,
      unitTypeId: u.unitTypeId,
      unitTypeName: typeMap.get(u.unitTypeId) || 'Apartment',
      propertyId: u.property.id,
      propertyName: u.property.name,
      propertyArea: u.property.area,
      tenantName: u.leases[0]?.tenant?.name || 'Vacant',
      monthlyRentQar: u.leases[0] ? Number(u.leases[0].rentAmount) : 0,
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findUnitsForProperty(propertyId: string, agencyId: string) {
    const prop = await this.prisma.property.findFirst({
      where: { id: propertyId, agencyId },
    });
    if (!prop) throw new NotFoundException('Property not found.');

    return this.prisma.unit.findMany({
      where: { propertyId },
      include: {
        leases: {
          where: { status: 'ACTIVE' },
          include: { tenant: true },
        },
      },
    });
  }

  async createUnit(propertyId: string, agencyId: string, data: any) {
    const prop = await this.prisma.property.findFirst({
      where: { id: propertyId, agencyId },
    });
    if (!prop) throw new NotFoundException('Property not found.');

    // Enforce subscription plan unit limit (returns 402 if limit breached)
    await this.billingService.assertUnitQuota(agencyId);

    return this.prisma.unit.create({
      data: {
        propertyId,
        unitNumber: data.unitNumber,
        floor: data.floor ? parseInt(data.floor, 10) : 1,
        bedrooms: data.bedrooms ? parseInt(data.bedrooms, 10) : 2,
        bathrooms: data.bathrooms ? parseInt(data.bathrooms, 10) : 2,
        sizeSqm: data.sizeSqm ? parseFloat(data.sizeSqm) : 110,
        unitTypeId: data.unitTypeId,
        status: data.status || UnitStatus.VACANT,
      },
    });
  }

  async getDeepDive(id: string, agencyId: string) {
    const prop = await this.prisma.property.findFirst({
      where: { id, agencyId },
      include: {
        units: {
          include: {
            leases: {
              where: { status: 'ACTIVE' },
              include: { tenant: { select: { id: true, name: true, phone: true } } },
              take: 1,
            },
            maintenanceRequests: {
              where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
              select: { id: true, title: true, priority: true, status: true },
            },
          },
          orderBy: [{ floor: 'desc' }, { unitNumber: 'asc' }],
        },
        expenses: {
          take: 5,
          orderBy: { incurredOn: 'desc' },
        },
        inspections: {
          take: 5,
          orderBy: { inspectionDate: 'desc' },
        },
      },
    });

    if (!prop) throw new NotFoundException('Property not found.');

    const totalUnits = prop.units.length;
    const occupiedUnits = prop.units.filter((u: any) => u.status === UnitStatus.OCCUPIED).length;
    const vacantUnits = prop.units.filter((u: any) => u.status === UnitStatus.VACANT).length;
    const maintenanceUnits = prop.units.filter((u: any) => u.status === UnitStatus.MAINTENANCE).length;
    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

    let totalMonthlyRevenueQar = 0;
    for (const u of prop.units) {
      if (u.leases[0]) {
        totalMonthlyRevenueQar += Number(u.leases[0].rentAmount);
      }
    }

    // Generate Stacking Matrix by Floor
    const floorsMap = new Map<number, any[]>();
    for (const u of prop.units) {
      const fl = u.floor || 1;
      if (!floorsMap.has(fl)) floorsMap.set(fl, []);
      floorsMap.get(fl)!.push({
        id: u.id,
        unitNumber: u.unitNumber,
        status: u.status,
        bedrooms: u.bedrooms,
        bathrooms: u.bathrooms,
        sizeSqm: Number(u.sizeSqm),
        rentAmount: u.leases[0] ? Number(u.leases[0].rentAmount) : null,
        tenantName: u.leases[0]?.tenant?.name || null,
        tenantPhone: u.leases[0]?.tenant?.phone || null,
        pendingTickets: u.maintenanceRequests.length,
      });
    }

    const stackingPlan = Array.from(floorsMap.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([floor, units]) => ({
        floor,
        floorLabel: `Floor ${floor}`,
        units,
      }));

    return {
      property: {
        id: prop.id,
        name: prop.name,
        area: prop.area,
        address: prop.address,
        nationalAddress: {
          zoneNumber: prop.zoneNumber || '66',
          streetNumber: prop.streetNumber || '840',
          buildingNumber: prop.buildingNumber || '12',
          pinNumber: prop.pinNumber || '23049102',
          kahramaaMeter: prop.kahramaaMeter || 'KM-882910-DHA',
        },
        ownerInfo: {
          name: prop.ownerName || 'Sheikh Khalid Bin Hamad Al-Thani',
          phone: prop.ownerPhone || '+974 5512 8899',
          iban: prop.ownerIban || 'QA55QNBA0000000012345678',
        },
        totalFloors: prop.totalFloors || 10,
        metrics: {
          totalUnits,
          occupiedUnits,
          vacantUnits,
          maintenanceUnits,
          occupancyRate,
          totalMonthlyRevenueQar,
        },
      },
      stackingPlan,
      recentExpenses: prop.expenses,
      recentInspections: prop.inspections,
      buildingDocuments: [
        { title: 'Building Completion Certificate (رخصة إتمام البناء)', certNo: 'BCC-2022-9901', authority: 'Doha Municipality' },
        { title: 'Civil Defense Approval (الدفاع المدني)', certNo: 'CD-QA-88410', authority: 'Ministry of Interior' },
        { title: 'Kahramaa Master Substation Approval', certNo: 'KM-SS-4912', authority: 'Kahramaa Qatar' },
      ],
    };
  }
}

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('properties')
export class PropertiesController {
  constructor(private service: PropertiesService) {}

  @Get()
  @RequirePermission('properties:view')
  async getProperties(@CurrentUser() user: any, @Query() query: any) {
    return this.service.findAll(user.agencyId, query);
  }

  @Post()
  @RequirePermission('properties:create')
  async createProperty(@CurrentUser() user: any, @Body() body: any) {
    return this.service.create(user.agencyId, body);
  }

  @Get('units/all')
  @RequirePermission('properties:view')
  async getAllUnits(@CurrentUser() user: any, @Query() query: any) {
    return this.service.findAllUnits(user.agencyId, query);
  }

  @Get(':id/deep-dive')
  @RequirePermission('properties:view')
  async getPropertyDeepDive(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.getDeepDive(id, user.agencyId);
  }

  @Get(':id')
  @RequirePermission('properties:view')
  async getProperty(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user.agencyId);
  }

  @Get(':id/units')
  @RequirePermission('properties:view')
  async getUnits(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findUnitsForProperty(id, user.agencyId);
  }

  @Post(':id/units')
  @RequirePermission('properties:create')
  async createUnit(
    @Param('id') propertyId: string,
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    return this.service.createUnit(propertyId, user.agencyId, body);
  }
}

@Module({
  imports: [SupportingModule],
  controllers: [PropertiesController],
  providers: [PropertiesService],
  exports: [PropertiesService],
})
export class PropertiesModule {}
