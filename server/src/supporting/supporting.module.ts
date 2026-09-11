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
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtAuthGuard, CurrentUser, RequirePermission, PermissionGuard } from '../auth/auth.module.js';


// -------------------------------------------------------------
// 2. Audit Logs Service & Controller
// -------------------------------------------------------------

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async getLogs(
    agencyId: string,
    query: {
      userId?: string;
      entityType?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: string;
      limit?: string;
    },
  ) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const where: any = { agencyId };
    if (query.userId) where.userId = query.userId;
    if (query.entityType) where.entityType = { contains: query.entityType, mode: 'insensitive' };
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller(['audit-logs', 'supporting/audit-logs'])
export class AuditLogController {
  constructor(private service: AuditLogService) {}

  @Get()
  @RequirePermission('settings:view')
  async getLogs(@CurrentUser() user: any, @Query() query: any) {
    return this.service.getLogs(user.agencyId, query);
  }
}

// -------------------------------------------------------------
// 3. Documents Service & Controller
// -------------------------------------------------------------

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async uploadDocument(
    agencyId: string,
    file: any,
    metadata: {
      tenantId?: string;
      leaseId?: string;
      maintenanceRequestId?: string;
      documentTypeListItemId?: string;
      fileName?: string;
    },
  ) {
    if (file && file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('File size exceeds maximum limit of 10MB');
    }
    // Generate simulated URL or use stored file
    const fileUrl = file
      ? `/uploads/${Date.now()}_${file.originalname}`
      : `/uploads/documents/${Date.now()}_document.pdf`;
    const fileName = metadata.fileName || file?.originalname || 'Qatar_Corporate_Document.pdf';

    return this.prisma.document.create({
      data: {
        fileUrl,
        fileName,
        documentTypeListItemId: metadata.documentTypeListItemId,
        tenantId: metadata.tenantId,
        leaseId: metadata.leaseId,
        maintenanceRequestId: metadata.maintenanceRequestId,
      },
    });
  }

  async getDocuments(query: {
    tenantId?: string;
    leaseId?: string;
    maintenanceRequestId?: string;
  }) {
    const where: any = {};
    if (query.tenantId) where.tenantId = query.tenantId;
    if (query.leaseId) where.leaseId = query.leaseId;
    if (query.maintenanceRequestId) where.maintenanceRequestId = query.maintenanceRequestId;

    return this.prisma.document.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async deleteDocument(id: string, agencyId: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: {
        tenant: true,
        lease: { include: { unit: { include: { property: true } } } },
        maintenanceRequest: { include: { unit: { include: { property: true } } } },
      },
    });
    if (!doc) throw new NotFoundException('Document not found.');
    const docAgency =
      doc.tenant?.agencyId ||
      doc.lease?.unit?.property?.agencyId ||
      doc.maintenanceRequest?.unit?.property?.agencyId;
    if (docAgency && docAgency !== agencyId) {
      throw new ForbiddenException('Access denied to this document.');
    }
    return this.prisma.document.delete({ where: { id } });
  }
}

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller(['documents', 'supporting/documents'])
export class DocumentsController {
  constructor(private service: DocumentsService) {}

  @Post('upload')
  @RequirePermission('documents:edit')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @CurrentUser() user: any,
    @UploadedFile() file: any,
    @Body() body: any,
  ) {
    return this.service.uploadDocument(user.agencyId, file, body);
  }

  @Get()
  @RequirePermission('documents:view')
  async getDocuments(@Query() query: any) {
    return this.service.getDocuments(query);
  }

  @Delete(':id')
  @RequirePermission('documents:edit')
  async deleteDocument(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.deleteDocument(id, user.agencyId);
  }
}


// -------------------------------------------------------------
// 5. Property Expenses Service & Controller
// -------------------------------------------------------------

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async getExpenses(
    agencyId: string,
    query: { propertyId?: string; categoryListItemId?: string; dateFrom?: string; dateTo?: string },
  ) {
    const where: any = {
      property: { agencyId },
    };

    if (query.propertyId) where.propertyId = query.propertyId;
    if (query.categoryListItemId) where.categoryListItemId = query.categoryListItemId;
    if (query.dateFrom || query.dateTo) {
      where.incurredOn = {};
      if (query.dateFrom) where.incurredOn.gte = new Date(query.dateFrom);
      if (query.dateTo) where.incurredOn.lte = new Date(query.dateTo);
    }

    return this.prisma.expense.findMany({
      where,
      include: {
        property: { select: { id: true, name: true } },
      },
      orderBy: { incurredOn: 'desc' },
    });
  }

  async createExpense(
    agencyId: string,
    data: {
      propertyId: string;
      categoryListItemId?: string;
      amount: number;
      incurredOn?: string;
      note?: string;
    },
  ) {
    const prop = await this.prisma.property.findFirst({
      where: { id: data.propertyId, agencyId },
    });
    if (!prop) throw new NotFoundException('Property not found.');

    return this.prisma.expense.create({
      data: {
        propertyId: data.propertyId,
        categoryListItemId: data.categoryListItemId,
        amount: data.amount,
        incurredOn: data.incurredOn ? new Date(data.incurredOn) : new Date(),
        note: data.note,
      },
    });
  }

  async deleteExpense(id: string, agencyId: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, property: { agencyId } },
    });
    if (!expense) throw new NotFoundException('Expense not found.');

    return this.prisma.expense.delete({ where: { id } });
  }
}

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller(['expenses', 'supporting/expenses'])
export class ExpensesController {
  constructor(private service: ExpensesService) {}

  @Get()
  @RequirePermission('reports:view')
  async getExpenses(@CurrentUser() user: any, @Query() query: any) {
    return this.service.getExpenses(user.agencyId, query);
  }

  @Post()
  @RequirePermission('reports:view')
  async createExpense(@CurrentUser() user: any, @Body() body: any) {
    return this.service.createExpense(user.agencyId, body);
  }

  @Delete(':id')
  @RequirePermission('reports:view')
  async deleteExpense(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.deleteExpense(id, user.agencyId);
  }
}

// -------------------------------------------------------------
// 6. Lease Renewal Requests Workflow
// -------------------------------------------------------------

@Injectable()
export class RenewalsService {
  constructor(private prisma: PrismaService) {}

  async proposeRenewal(
    leaseId: string,
    agencyId: string,
    userId: string,
    data: { proposedRentAmount: number; proposedEndDate: string },
  ) {
    const lease = await this.prisma.lease.findFirst({
      where: { id: leaseId, unit: { property: { agencyId } } },
    });
    if (!lease) throw new NotFoundException('Lease not found.');

    // Update lease status to RENEWAL_PENDING
    await this.prisma.lease.update({
      where: { id: leaseId },
      data: { status: 'RENEWAL_PENDING' as any },
    });

    return this.prisma.renewalRequest.create({
      data: {
        leaseId,
        proposedRentAmount: data.proposedRentAmount,
        proposedEndDate: new Date(data.proposedEndDate),
        status: 'PENDING' as any,
        requestedById: userId,
      },
    });
  }

  async approveRenewal(renewalId: string, agencyId: string, approverId: string) {
    const renewal = await this.prisma.renewalRequest.findUnique({
      where: { id: renewalId },
      include: { lease: { include: { unit: { include: { property: true } } } } },
    });

    if (!renewal || renewal.lease.unit.property.agencyId !== agencyId) {
      throw new NotFoundException('Renewal request not found.');
    }

    // Update lease and request
    await this.prisma.$transaction([
      this.prisma.renewalRequest.update({
        where: { id: renewalId },
        data: {
          status: 'APPROVED' as any,
          approvedById: approverId,
        },
      }),
      this.prisma.lease.update({
        where: { id: renewal.leaseId },
        data: {
          rentAmount: renewal.proposedRentAmount,
          endDate: renewal.proposedEndDate,
          status: 'ACTIVE' as any,
        },
      }),
    ]);

    return { message: 'Lease renewal approved successfully.' };
  }

  async rejectRenewal(renewalId: string, agencyId: string) {
    const renewal = await this.prisma.renewalRequest.findUnique({
      where: { id: renewalId },
      include: { lease: { include: { unit: { include: { property: true } } } } },
    });

    if (!renewal || renewal.lease.unit.property.agencyId !== agencyId) {
      throw new NotFoundException('Renewal request not found.');
    }

    await this.prisma.$transaction([
      this.prisma.renewalRequest.update({
        where: { id: renewalId },
        data: { status: 'REJECTED' as any },
      }),
      this.prisma.lease.update({
        where: { id: renewal.leaseId },
        data: { status: 'ACTIVE' as any },
      }),
    ]);

    return { message: 'Lease renewal rejected.' };
  }

  async deleteRenewal(renewalId: string, agencyId: string) {
    const renewal = await this.prisma.renewalRequest.findUnique({
      where: { id: renewalId },
      include: { lease: { include: { unit: { include: { property: true } } } } },
    });

    if (!renewal || renewal.lease.unit.property.agencyId !== agencyId) {
      throw new NotFoundException('Renewal request not found.');
    }

    if ((renewal.status as string) === 'APPROVED') {
      throw new BadRequestException('Cannot delete an approved renewal request.');
    }

    return this.prisma.renewalRequest.delete({ where: { id: renewalId } });
  }
}

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller()
export class RenewalsController {
  constructor(private service: RenewalsService) {}

  @Post('leases/:id/renewal-requests')
  @RequirePermission('leases:create')
  async propose(
    @Param('id') leaseId: string,
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    return this.service.proposeRenewal(leaseId, user.agencyId, user.id, body);
  }

  @Patch('renewal-requests/:id/approve')
  @RequirePermission('leases:approve')
  async approve(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.approveRenewal(id, user.agencyId, user.id);
  }

  @Patch('renewal-requests/:id/reject')
  @RequirePermission('leases:approve')
  async reject(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.rejectRenewal(id, user.agencyId);
  }

  @Delete('renewal-requests/:id')
  @RequirePermission('leases:create')
  async deleteRenewal(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.deleteRenewal(id, user.agencyId);
  }
}

// -------------------------------------------------------------
// Module Definition
// -------------------------------------------------------------

@Module({
  controllers: [
    AuditLogController,
    DocumentsController,
    ExpensesController,
    RenewalsController,
  ],
  providers: [
    AuditLogService,
    DocumentsService,
    ExpensesService,
    RenewalsService,
  ],
  exports: [
    AuditLogService,
    DocumentsService,
    ExpensesService,
    RenewalsService,
  ],
})
export class SupportingModule {}
