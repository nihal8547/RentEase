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
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtAuthGuard, CurrentUser, PermissionGuard } from '../auth/auth.module.js';
import { RedisService } from '../redis/redis.service.js';

// =============================================================
// 1. CHEQUES SERVICE & CONTROLLER (PDC VAULT)
// =============================================================

@Injectable()
export class ChequesService {
  constructor(private prisma: PrismaService, private redis: RedisService) {}

  async getChequesSummary(agencyId: string) {
    const cacheKey = `agency:${agencyId}:summary:cheques`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const stats = await this.prisma.cheque.groupBy({
      by: ['status'],
      _count: { _all: true },
      _sum: { amount: true },
      where: { lease: { unit: { property: { agencyId } } } },
    });

    const total = stats.reduce((acc, curr) => acc + curr._count._all, 0);
    const cleared = stats.find(s => s.status === 'CLEARED')?._count._all || 0;
    const pending = (stats.find(s => s.status === 'PENDING')?._count._all || 0) + (stats.find(s => s.status === 'IN_VAULT')?._count._all || 0);
    const bounced = stats.find(s => s.status === 'BOUNCED')?._count._all || 0;
    const totalVal = (stats.find(s => s.status === 'PENDING')?._sum.amount?.toNumber() || 0) + (stats.find(s => s.status === 'IN_VAULT')?._sum.amount?.toNumber() || 0);

    const result = { total, cleared, pending, bounced, totalVal };
    await this.redis.set(cacheKey, result, 60);
    return result;
  }

  async getCheques(agencyId: string, query: any) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.max(1, parseInt(query.limit) || 10);
    const skip = (page - 1) * limit;

    const where: any = { lease: { unit: { property: { agencyId } } } };
    if (query.status) where.status = query.status;
    if (query.bankName) where.bankName = { contains: query.bankName, mode: 'insensitive' };
    if (query.search) {
      where.OR = [
        { chequeNumber: { contains: query.search, mode: 'insensitive' } },
        { drawerName: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.dateFrom || query.dateTo) {
      where.dueDate = {};
      if (query.dateFrom) where.dueDate.gte = new Date(query.dateFrom);
      if (query.dateTo) where.dueDate.lte = new Date(query.dateTo);
    }

    let orderBy: any = { dueDate: 'asc' };
    if (query.sort) {
      const [field, direction] = query.sort.split(':');
      if (field && direction) orderBy = { [field]: direction };
    }

    const [total, cheques] = await Promise.all([
      this.prisma.cheque.count({ where }),
      this.prisma.cheque.findMany({
        where,
        include: {
          lease: {
            include: {
              tenant: { select: { id: true, name: true, phone: true } },
              unit: {
                select: {
                  unitNumber: true,
                  property: { select: { name: true, area: true } },
                },
              },
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    const data = cheques.map((c: any) => ({
      id: c.id,
      chequeNumber: c.chequeNumber,
      bankName: c.bankName,
      drawerName: c.drawerName,
      amount: Number(c.amount),
      dueDate: c.dueDate,
      status: c.status,
      vaultLocation: c.vaultLocation,
      depositDate: c.depositDate,
      clearedDate: c.clearedDate,
      bouncedDate: c.bouncedDate,
      bounceReason: c.bounceReason,
      notes: c.notes,
      lease: c.lease,
    }));

    return { data, total, page, limit };
  }

  private async invalidateCache(agencyId: string) {
    await this.redis.del(`agency:${agencyId}:summary:cheques`);
  }

  async createCheque(agencyId: string, data: any) {
    const lease = await this.prisma.lease.findFirst({
      where: { id: data.leaseId, unit: { property: { agencyId } } },
      include: { tenant: true },
    });
    if (!lease) throw new NotFoundException('Lease not found in this agency.');

    const cheque = await this.prisma.cheque.create({
      data: {
        leaseId: data.leaseId,
        chequeNumber: data.chequeNumber,
        bankName: data.bankName || 'QNB',
        drawerName: data.drawerName || lease.tenant.name,
        amount: data.amount,
        dueDate: new Date(data.dueDate),
        status: data.status || 'IN_VAULT',
        vaultLocation: data.vaultLocation,
        notes: data.notes,
      },
    });
    await this.invalidateCache(agencyId);
    return cheque;
  }

  async updateStatus(id: string, agencyId: string, data: any) {
    const cheque = await this.prisma.cheque.findFirst({
      where: { id, lease: { unit: { property: { agencyId } } } },
    });
    if (!cheque) throw new NotFoundException('Cheque not found.');

    const updateData: any = { status: data.status };
    if (data.status === 'DEPOSITED') updateData.depositDate = new Date();
    else if (data.status === 'CLEARED') updateData.clearedDate = new Date();
    else if (data.status === 'BOUNCED') {
      updateData.bouncedDate = new Date();
      updateData.bounceReason = data.bounceReason || 'Insufficient funds';
    }
    if (data.notes) updateData.notes = data.notes;
    if (data.vaultLocation) updateData.vaultLocation = data.vaultLocation;

    const updated = await this.prisma.cheque.update({ where: { id }, data: updateData });
    await this.invalidateCache(agencyId);
    return updated;
  }

  async deleteCheque(id: string, agencyId: string) {
    const cheque = await this.prisma.cheque.findFirst({
      where: { id, lease: { unit: { property: { agencyId } } } },
    });
    if (!cheque) throw new NotFoundException('Cheque not found.');
    if (cheque.status === 'DEPOSITED' || cheque.status === 'CLEARED') {
      throw new ForbiddenException('Cannot delete a deposited or cleared cheque.');
    }
    await this.prisma.cheque.delete({ where: { id } });
    await this.invalidateCache(agencyId);
  }
}

@Controller('cheques')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ChequesController {
  constructor(private chequesService: ChequesService) {}

  @Get('summary')
  getSummary(@CurrentUser() user: any) {
    return this.chequesService.getChequesSummary(user.agencyId);
  }

  @Get()
  getCheques(@CurrentUser() user: any, @Query() query: any) {
    return this.chequesService.getCheques(user.agencyId, query);
  }

  @Post()
  createCheque(@CurrentUser() user: any, @Body() body: any) {
    return this.chequesService.createCheque(user.agencyId, body);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return this.chequesService.updateStatus(id, user.agencyId, body);
  }

  @Delete(':id')
  deleteCheque(@Param('id') id: string, @CurrentUser() user: any) {
    return this.chequesService.deleteCheque(id, user.agencyId);
  }
}


// =============================================================
// 2. TAWTHEEQ SERVICE & CONTROLLER
// =============================================================

@Injectable()
export class TawtheeqService {
  constructor(private prisma: PrismaService, private redis: RedisService) {}

  async getRegistrationsSummary(agencyId: string) {
    const cacheKey = `agency:${agencyId}:summary:tawtheeq`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const stats = await this.prisma.tawtheeqRegistration.groupBy({
      by: ['status'],
      _count: { _all: true },
      _sum: { municipalityFee: true },
      where: { lease: { unit: { property: { agencyId } } } },
    });

    const total = stats.reduce((acc, curr) => acc + curr._count._all, 0);
    const approved = stats.find(s => s.status === 'APPROVED')?._count._all || 0;
    const pending = (stats.find(s => s.status === 'PENDING_APPROVAL')?._count._all || 0) + (stats.find(s => s.status === 'SUBMITTED')?._count._all || 0);
    const expired = stats.find(s => s.status === 'EXPIRED')?._count._all || 0;
    
    const result = { total, approved, pending, expired };
    await this.redis.set(cacheKey, result, 60);
    return result;
  }

  async getRegistrations(agencyId: string, query: any) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.max(1, parseInt(query.limit) || 10);
    const skip = (page - 1) * limit;

    const where: any = { lease: { unit: { property: { agencyId } } } };
    if (query.status) where.status = query.status;

    let orderBy: any = { contractDate: 'desc' };
    if (query.sort) {
      const [field, direction] = query.sort.split(':');
      if (field && direction) orderBy = { [field]: direction };
    }

    const [total, registrations] = await Promise.all([
      this.prisma.tawtheeqRegistration.count({ where }),
      this.prisma.tawtheeqRegistration.findMany({
        where,
        include: {
          lease: {
            include: {
              tenant: { select: { id: true, name: true, phone: true } },
              unit: { select: { unitNumber: true, property: { select: { id: true, name: true, area: true } } } },
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    const data = registrations.map((r: any) => ({
      id: r.id,
      registrationNumber: r.registrationNumber,
      status: r.status,
      contractDate: r.contractDate,
      expiryDate: r.expiryDate,
      municipalityFee: Number(r.municipalityFee),
      certificateUrl: r.certificateUrl,
      registeredAt: r.registeredAt,
      lease: r.lease,
    }));

    return { data, total, page, limit };
  }

  private async invalidateCache(agencyId: string) {
    await this.redis.del(`agency:${agencyId}:summary:tawtheeq`);
    await this.redis.del(`agency:${agencyId}:kpis`);
    await this.redis.del(`agency:${agencyId}:reports:occupancy`);
  }

  async createRegistration(agencyId: string, data: any) {
    const lease = await this.prisma.lease.findFirst({
      where: { id: data.leaseId, unit: { property: { agencyId } } },
    });
    if (!lease) throw new NotFoundException('Lease not found in this agency.');

    const reg = await this.prisma.tawtheeqRegistration.create({
      data: {
        leaseId: data.leaseId,
        registrationNumber: data.registrationNumber,
        status: data.status || 'DRAFT',
        contractDate: new Date(data.contractDate),
        expiryDate: new Date(data.expiryDate),
        municipalityFee: data.municipalityFee || 0,
        certificateUrl: data.certificateUrl,
      },
    });
    await this.invalidateCache(agencyId);
    return reg;
  }

  async updateStatus(id: string, agencyId: string, data: any) {
    const reg = await this.prisma.tawtheeqRegistration.findFirst({
      where: { id, lease: { unit: { property: { agencyId } } } },
    });
    if (!reg) throw new NotFoundException('Tawtheeq registration not found.');

    const updated = await this.prisma.tawtheeqRegistration.update({
      where: { id },
      data: {
        status: data.status,
        registrationNumber: data.registrationNumber || reg.registrationNumber,
        certificateUrl: data.certificateUrl,
        registeredAt: data.status === 'APPROVED' ? new Date() : reg.registeredAt,
      },
    });
    await this.invalidateCache(agencyId);
    return updated;
  }
}

@Controller('tawtheeq')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class TawtheeqController {
  constructor(private tawtheeqService: TawtheeqService) {}

  @Get('summary')
  getSummary(@CurrentUser() user: any) {
    return this.tawtheeqService.getRegistrationsSummary(user.agencyId);
  }

  @Get()
  getRegistrations(@CurrentUser() user: any, @Query() query: any) {
    return this.tawtheeqService.getRegistrations(user.agencyId, query);
  }

  @Post()
  createRegistration(@CurrentUser() user: any, @Body() body: any) {
    return this.tawtheeqService.createRegistration(user.agencyId, body);
  }

  @Patch(':id')
  updateStatus(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return this.tawtheeqService.updateStatus(id, user.agencyId, body);
  }
}

// =============================================================
// 3. INSPECTIONS SERVICE & CONTROLLER
// =============================================================

@Injectable()
export class InspectionsService {
  constructor(private prisma: PrismaService, private redis: RedisService) {}

  async getInspectionsSummary(agencyId: string) {
    const cacheKey = `agency:${agencyId}:summary:inspections`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const stats = await this.prisma.inspection.groupBy({
      by: ['status'],
      _count: { _all: true },
      where: { unit: { property: { agencyId } } },
    });

    const total = stats.reduce((acc, curr) => acc + curr._count._all, 0);
    const completed = (stats.find(s => s.status === 'COMPLETED')?._count._all || 0) + (stats.find(s => s.status === 'SIGNED')?._count._all || 0);
    const pending = (stats.find(s => s.status === 'DRAFT')?._count._all || 0) + (stats.find(s => s.status === 'IN_REVIEW')?._count._all || 0);

    const result = { total, completed, pending };
    await this.redis.set(cacheKey, result, 60);
    return result;
  }

  async getInspections(agencyId: string, query: any) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.max(1, parseInt(query.limit) || 10);
    const skip = (page - 1) * limit;

    const where: any = { unit: { property: { agencyId } } };
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.unitId) where.unitId = query.unitId;

    let orderBy: any = { conductedAt: 'desc' };
    if (query.sort) {
      const [field, direction] = query.sort.split(':');
      if (field && direction) orderBy = { [field]: direction };
    }

    const [total, inspections] = await Promise.all([
      this.prisma.inspection.count({ where }),
      this.prisma.inspection.findMany({
        where,
        include: {
          unit: { select: { unitNumber: true, property: { select: { id: true, name: true, area: true } } } },
          lease: { include: { tenant: { select: { id: true, name: true, phone: true } } } },
        },
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    const data = inspections.map((i: any) => ({
      id: i.id,
      type: i.type,
      status: i.status,
      conductedBy: i.conductedBy,
      conductedAt: i.conductedAt,
      electricityMeter: i.electricityMeter ? Number(i.electricityMeter) : null,
      waterMeter: i.waterMeter ? Number(i.waterMeter) : null,
      checklist: i.checklist,
      deductionsAmount: i.deductionsAmount ? Number(i.deductionsAmount) : 0,
      signatureUrl: i.signatureUrl,
      notes: i.notes,
      unit: i.unit,
      lease: i.lease,
    }));

    return { data, total, page, limit };
  }

  private async invalidateCache(agencyId: string) {
    await this.redis.del(`agency:${agencyId}:summary:inspections`);
  }

  async createInspection(agencyId: string, data: any) {
    const unit = await this.prisma.unit.findFirst({
      where: { id: data.unitId, property: { agencyId } },
    });
    if (!unit) throw new NotFoundException('Unit not found in this agency.');

    const inspection = await this.prisma.inspection.create({
      data: {
        unitId: data.unitId,
        leaseId: data.leaseId || null,
        type: data.type || 'MOVE_IN',
        status: data.status || 'DRAFT',
        conductedBy: data.conductedBy,
        conductedAt: data.conductedAt ? new Date(data.conductedAt) : new Date(),
        electricityMeter: data.electricityMeter,
        waterMeter: data.waterMeter,
        checklist: data.checklist || {},
        deductionsAmount: data.deductionsAmount || 0,
        notes: data.notes,
      },
    });
    await this.invalidateCache(agencyId);
    return inspection;
  }

  async updateInspection(id: string, agencyId: string, data: any) {
    const inspection = await this.prisma.inspection.findFirst({
      where: { id, unit: { property: { agencyId } } },
    });
    if (!inspection) throw new NotFoundException('Inspection not found.');

    const updated = await this.prisma.inspection.update({
      where: { id },
      data: {
        status: data.status,
        deductionsAmount: data.deductionsAmount,
        notes: data.notes,
        signatureUrl: data.signatureUrl,
        checklist: data.checklist,
        electricityMeter: data.electricityMeter,
        waterMeter: data.waterMeter,
      },
    });
    await this.invalidateCache(agencyId);
    return updated;
  }

  async deleteInspection(id: string, agencyId: string) {
    const inspection = await this.prisma.inspection.findFirst({
      where: { id, unit: { property: { agencyId } } },
    });
    if (!inspection) throw new NotFoundException('Inspection not found.');
    if (inspection.status === 'SIGNED') {
      throw new ForbiddenException('Cannot delete a signed inspection report.');
    }
    await this.prisma.inspection.delete({ where: { id } });
    await this.invalidateCache(agencyId);
  }
}

@Controller('inspections')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class InspectionsController {
  constructor(private inspectionsService: InspectionsService) {}

  @Get('summary')
  getSummary(@CurrentUser() user: any) {
    return this.inspectionsService.getInspectionsSummary(user.agencyId);
  }

  @Get()
  getInspections(@CurrentUser() user: any, @Query() query: any) {
    return this.inspectionsService.getInspections(user.agencyId, query);
  }

  @Post()
  createInspection(@CurrentUser() user: any, @Body() body: any) {
    return this.inspectionsService.createInspection(user.agencyId, body);
  }

  @Patch(':id')
  updateInspection(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return this.inspectionsService.updateInspection(id, user.agencyId, body);
  }

  @Delete(':id')
  deleteInspection(@Param('id') id: string, @CurrentUser() user: any) {
    return this.inspectionsService.deleteInspection(id, user.agencyId);
  }
}

// =============================================================
// 4. OWNER PAYOUTS SERVICE & CONTROLLER
// =============================================================

@Injectable()
export class OwnerPayoutsService {
  constructor(private prisma: PrismaService, private redis: RedisService) {}

  async getPayoutsSummary(agencyId: string) {
    const cacheKey = `agency:${agencyId}:summary:payouts`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const stats = await this.prisma.ownerPayout.groupBy({
      by: ['status'],
      _count: { _all: true },
      _sum: { netPayout: true },
      where: { agencyId },
    });

    const total = stats.reduce((acc, curr) => acc + curr._count._all, 0);
    const paid = stats.find(s => s.status === 'PAID')?._count._all || 0;
    const processing = stats.find(s => s.status === 'PROCESSING')?._count._all || 0;
    const drafted = stats.find(s => s.status === 'DRAFT')?._count._all || 0;
    const paidAmount = stats.find(s => s.status === 'PAID')?._sum.netPayout?.toNumber() || 0;

    const result = { total, paid, processing, drafted, paidAmount };
    await this.redis.set(cacheKey, result, 60);
    return result;
  }

  async getPayouts(agencyId: string, query: any) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.max(1, parseInt(query.limit) || 10);
    const skip = (page - 1) * limit;

    const where: any = { agencyId };
    if (query.status) where.status = query.status;
    if (query.propertyId) where.propertyId = query.propertyId;

    let orderBy: any = { periodMonth: 'desc' };
    if (query.sort) {
      const [field, direction] = query.sort.split(':');
      if (field && direction) orderBy = { [field]: direction };
    }

    const [total, payouts] = await Promise.all([
      this.prisma.ownerPayout.count({ where }),
      this.prisma.ownerPayout.findMany({
        where,
        include: {
          property: { select: { id: true, name: true, area: true, ownerName: true, ownerIban: true, ownerPhone: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    const data = payouts.map((p: any) => ({
      id: p.id,
      periodMonth: p.periodMonth,
      grossRent: Number(p.grossRent),
      expensesDeducted: Number(p.expensesDeducted),
      managementCommission: Number(p.managementCommission),
      netPayout: Number(p.netPayout),
      status: p.status,
      paymentReference: p.paymentReference,
      paidAt: p.paidAt,
      breakdown: p.breakdown,
      property: p.property,
    }));

    return { data, total, page, limit };
  }

  private async invalidateCache(agencyId: string) {
    await this.redis.del(`agency:${agencyId}:summary:payouts`);
  }

  async createPayout(agencyId: string, data: any) {
    const property = await this.prisma.property.findFirst({
      where: { id: data.propertyId, agencyId },
    });
    if (!property) throw new NotFoundException('Property not found in this agency.');

    const grossRent = Number(data.grossRent) || 0;
    const expensesDeducted = Number(data.expensesDeducted) || 0;
    const feeRate = Number(data.managementFeePercent) || 8;
    const managementCommission = (grossRent * feeRate) / 100;
    const netPayout = grossRent - expensesDeducted - managementCommission;

    const payout = await this.prisma.ownerPayout.create({
      data: {
        agencyId,
        propertyId: data.propertyId,
        periodMonth: data.periodMonth,
        grossRent,
        expensesDeducted,
        managementCommission,
        netPayout,
        status: 'DRAFT',
        breakdown: {
          agencyFeeRate: `${feeRate}%`,
          collectedRentUnits: data.collectedRentUnits || [],
          deductedExpenses: data.deductedExpenses || [],
        },
      },
    });
    await this.invalidateCache(agencyId);
    return payout;
  }

  async markPaid(id: string, agencyId: string, data: any) {
    const payout = await this.prisma.ownerPayout.findFirst({ where: { id, agencyId } });
    if (!payout) throw new NotFoundException('Payout not found.');
    const updated = await this.prisma.ownerPayout.update({
      where: { id },
      data: { status: 'PAID', paymentReference: data.paymentReference, paidAt: new Date() },
    });
    await this.invalidateCache(agencyId);
    return updated;
  }

  async deletePayout(id: string, agencyId: string) {
    const payout = await this.prisma.ownerPayout.findFirst({ where: { id, agencyId } });
    if (!payout) throw new NotFoundException('Payout not found.');
    if (payout.status === 'PAID') throw new ForbiddenException('Cannot delete a paid payout.');
    await this.prisma.ownerPayout.delete({ where: { id } });
    await this.invalidateCache(agencyId);
  }
}

@Controller('owner-payouts')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class OwnerPayoutsController {
  constructor(private ownerPayoutsService: OwnerPayoutsService) {}

  @Get()
  getPayouts(@CurrentUser() user: any, @Query() query: any) {
    return this.ownerPayoutsService.getPayouts(user.agencyId, query);
  }

  @Post()
  createPayout(@CurrentUser() user: any, @Body() body: any) {
    return this.ownerPayoutsService.createPayout(user.agencyId, body);
  }

  @Patch(':id/pay')
  markPaid(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return this.ownerPayoutsService.markPaid(id, user.agencyId, body);
  }

  @Delete(':id')
  deletePayout(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ownerPayoutsService.deletePayout(id, user.agencyId);
  }
}

// =============================================================
// 5. COMMUNICATIONS SERVICE & CONTROLLER
// =============================================================

@Injectable()
export class CommunicationsService {
  constructor(private prisma: PrismaService) {}

  getTemplates() {
    return [
      { key: 'rent_due', nameEn: 'Rent Due Reminder', nameAr: 'تذكير استحقاق الإيجار', channel: 'WHATSAPP' },
      { key: 'renewal_60day', nameEn: '60-Day Renewal Notice', nameAr: 'إشعار التجديد قبل 60 يوماً', channel: 'WHATSAPP' },
      { key: 'maintenance_arrival', nameEn: 'Maintenance Arrival Notice', nameAr: 'إشعار وصول فني الصيانة', channel: 'METRASH_SMS' },
      { key: 'payment_receipt', nameEn: 'Payment Receipt Confirmation', nameAr: 'تأكيد استلام الدفعة', channel: 'WHATSAPP' },
    ];
  }

  async getLogs(agencyId: string, query: any) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.max(1, parseInt(query.limit) || 10);
    const skip = (page - 1) * limit;

    const where: any = { agencyId };
    if (query.channel) where.channel = query.channel;

    let orderBy: any = { sentAt: 'desc' };
    if (query.sort) {
      const [field, direction] = query.sort.split(':');
      if (field && direction) orderBy = { [field]: direction };
    }

    const [total, logs] = await Promise.all([
      this.prisma.communicationLog.count({ where }),
      this.prisma.communicationLog.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    const data = logs.map((l: any) => ({
      id: l.id,
      recipientPhone: l.recipientPhone,
      recipientName: l.recipientName,
      channel: l.channel,
      templateKey: l.templateKey,
      messageText: l.messageText,
      status: l.status,
      sentAt: l.sentAt,
    }));

    return { data, total, page, limit };
  }

  async sendMessage(agencyId: string, data: any) {
    return this.prisma.communicationLog.create({
      data: {
        agencyId,
        recipientPhone: data.recipientPhone,
        recipientName: data.recipientName,
        channel: data.channel || 'WHATSAPP',
        templateKey: data.templateKey,
        messageText: data.messageText,
        status: 'SENT',
        sentAt: new Date(),
      },
    });
  }
}

@Controller('communications')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class CommunicationsController {
  constructor(private communicationsService: CommunicationsService) {}

  @Get('templates')
  getTemplates() {
    return this.communicationsService.getTemplates();
  }

  @Get('logs')
  getLogs(@CurrentUser() user: any, @Query() query: any) {
    return this.communicationsService.getLogs(user.agencyId, query);
  }

  @Post('send')
  sendMessage(@CurrentUser() user: any, @Body() body: any) {
    return this.communicationsService.sendMessage(user.agencyId, body);
  }
}

// =============================================================
// MODULE ASSEMBLY
// =============================================================

@Module({
  controllers: [ChequesController, TawtheeqController, InspectionsController, OwnerPayoutsController, CommunicationsController],
  providers: [ChequesService, TawtheeqService, InspectionsService, OwnerPayoutsService, CommunicationsService],
})
export class OperationsModule {}
