import {
  Module,
  Injectable,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtAuthGuard, CurrentUser, RequirePermission, PermissionGuard } from '../auth/auth.module.js';

@Injectable()
export class VendorsService {
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
      ];
    }

    const specialtyId = query['filter[specialtyListItemId]'] || query.specialtyListItemId;
    if (specialtyId) {
      where.specialtyListItemId = specialtyId;
    }

    if (query['filter[isActive]'] !== undefined || query.isActive !== undefined) {
      const activeStr = query['filter[isActive]'] ?? query.isActive;
      where.isActive = activeStr === 'true' || activeStr === true;
    }

    const [vendors, total] = await Promise.all([
      this.prisma.vendor.findMany({
        where,
        include: {
          _count: {
            select: { maintenanceRequests: true },
          },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.vendor.count({ where }),
    ]);

    // Fetch specialty labels
    const specIds = [...new Set(vendors.map((v) => v.specialtyListItemId).filter(Boolean))];
    const specItems = await this.prisma.listItem.findMany({
      where: { id: { in: specIds } },
    });
    const specMap = new Map(specItems.map((s) => [s.id, s.label]));

    const data = vendors.map((v) => ({
      id: v.id,
      name: v.name,
      phone: v.phone,
      specialtyListItemId: v.specialtyListItemId,
      specialty: specMap.get(v.specialtyListItemId) || 'General Contractor',
      rating: v.rating ? Number(v.rating) : 4.5,
      isActive: v.isActive,
      activeJobsCount: v._count.maintenanceRequests,
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
    return this.prisma.vendor.create({
      data: {
        agencyId,
        name: data.name,
        phone: data.phone,
        specialtyListItemId: data.specialtyListItemId,
        rating: data.rating || 4.5,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
  }

  async update(id: string, agencyId: string, data: any) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id, agencyId },
    });
    if (!vendor) throw new NotFoundException('Vendor not found.');

    return this.prisma.vendor.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, agencyId: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id, agencyId },
    });
    if (!vendor) throw new NotFoundException('Vendor not found.');

    return this.prisma.vendor.delete({ where: { id } });
  }
}

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('vendors')
export class VendorsController {
  constructor(private service: VendorsService) {}

  @Get()
  @RequirePermission('vendors:view')
  async getVendors(@CurrentUser() user: any, @Query() query: any) {
    return this.service.findAll(user.agencyId, query);
  }

  @Post()
  @RequirePermission('vendors:create')
  async createVendor(@CurrentUser() user: any, @Body() body: any) {
    return this.service.create(user.agencyId, body);
  }

  @Patch(':id')
  @RequirePermission('vendors:edit')
  async updateVendor(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    return this.service.update(id, user.agencyId, body);
  }

  @Delete(':id')
  @RequirePermission('vendors:delete')
  async deleteVendor(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.delete(id, user.agencyId);
  }
}

@Module({
  controllers: [VendorsController],
  providers: [VendorsService],
  exports: [VendorsService],
})
export class VendorsModule {}
