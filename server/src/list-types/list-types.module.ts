import {
  Module,
  Injectable,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtAuthGuard, CurrentUser, RequirePermission, PermissionGuard } from '../auth/auth.module.js';

@Injectable()
export class ListTypesService {
  constructor(private prisma: PrismaService) {}

  normalizeKey(key: string): string {
    const map: Record<string, string> = {
      property_types: 'unit_type',
      unit_types: 'unit_type',
      furnishing_statuses: 'amenity',
      lease_termination_reasons: 'lease_type',
      maintenance_categories: 'maintenance_category',
      expense_categories: 'expense_category',
      payment_methods: 'payment_method',
      nationalities: 'nationality',
      vendor_specialties: 'vendor_specialty',
      amenities: 'amenity',
    };
    return map[key] || key;
  }

  // Merge global default list items + agency custom items
  async getItemsByKey(rawKey: string, agencyId?: string) {
    const key = this.normalizeKey(rawKey);
    // 1. Fetch global list type definition
    const globalType = await this.prisma.listType.findFirst({
      where: { key, agencyId: null },
      include: {
        items: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    // 2. Fetch agency-scoped list type if agencyId is provided
    let agencyItems: any[] = [];
    if (agencyId) {
      const agencyType = await this.prisma.listType.findFirst({
        where: { key, agencyId },
        include: {
          items: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
      if (agencyType) {
        agencyItems = agencyType.items;
      }
    }

    const defaultItems = globalType?.items || [];
    const allItems = [...defaultItems, ...agencyItems];

    return {
      key,
      label: globalType?.label || key,
      items: allItems,
    };
  }

  // Agency creates a new custom list item
  async createCustomItem(
    rawKey: string,
    agencyId: string,
    userId: string,
    data: { label: string; value?: string },
  ) {
    const key = this.normalizeKey(rawKey);
    if (!data.label || !data.label.trim()) {
      throw new BadRequestException('Label is required.');
    }

    // Find or create agency list type
    let agencyListType = await this.prisma.listType.findFirst({
      where: { key, agencyId },
    });

    if (!agencyListType) {
      const globalType = await this.prisma.listType.findFirst({
        where: { key, agencyId: null },
      });
      agencyListType = await this.prisma.listType.create({
        data: {
          key,
          label: globalType?.label || key,
          agencyId,
        },
      });
    }

    const machineValue =
      data.value ||
      data.label
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

    const existingItem = await this.prisma.listItem.findFirst({
      where: {
        listTypeId: agencyListType.id,
        value: machineValue,
      },
    });

    if (existingItem) {
      // If previously soft-disabled, reactivate
      if (!existingItem.isActive) {
        return this.prisma.listItem.update({
          where: { id: existingItem.id },
          data: { isActive: true, label: data.label },
        });
      }
      return existingItem;
    }

    return this.prisma.listItem.create({
      data: {
        listTypeId: agencyListType.id,
        value: machineValue,
        label: data.label.trim(),
        isDefault: false,
        isActive: true,
        sortOrder: 99,
        createdById: userId,
      },
    });
  }

  // Rename or reorder an item
  async updateItem(
    id: string,
    agencyId: string,
    data: { label?: string; sortOrder?: number; isActive?: boolean },
  ) {
    const item = await this.prisma.listItem.findUnique({
      where: { id },
      include: { listType: true },
    });

    if (!item) {
      throw new NotFoundException('List item not found.');
    }

    // Only agency items can have their machine label edited
    if (item.isDefault && data.label && data.label !== item.label) {
      throw new ForbiddenException('Default system items cannot be renamed.');
    }

    return this.prisma.listItem.update({
      where: { id },
      data: {
        label: data.label ?? item.label,
        sortOrder: data.sortOrder ?? item.sortOrder,
        isActive: data.isActive ?? item.isActive,
      },
    });
  }

  // Soft-disable an item (works on default items too)
  async toggleItemStatus(id: string) {
    const item = await this.prisma.listItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('List item not found.');

    return this.prisma.listItem.update({
      where: { id },
      data: { isActive: !item.isActive },
    });
  }

  // Hard delete: allowed ONLY for agency-created items with zero foreign-key references
  async deleteItem(id: string, agencyId: string) {
    const item = await this.prisma.listItem.findUnique({
      where: { id },
      include: { listType: true },
    });

    if (!item) {
      throw new NotFoundException('List item not found.');
    }

    if (item.isDefault) {
      throw new ForbiddenException('System default list items cannot be deleted. You may deactivate them instead.');
    }

    if (item.listType.agencyId !== agencyId) {
      throw new ForbiddenException('You do not own this list item.');
    }

    // Check for references across all entities
    const unitCount = await this.prisma.unit.count({ where: { unitTypeId: id } });
    const tenantCount = await this.prisma.tenant.count({ where: { nationalityListItemId: id } });
    const leaseCount = await this.prisma.lease.count({ where: { leaseTypeListItemId: id } });
    const paymentCount = await this.prisma.payment.count({ where: { methodListItemId: id } });
    const vendorCount = await this.prisma.vendor.count({ where: { specialtyListItemId: id } });
    const maintCount = await this.prisma.maintenanceRequest.count({ where: { categoryListItemId: id } });
    const expenseCount = await this.prisma.expense.count({ where: { categoryListItemId: id } });
    const docCount = await this.prisma.document.count({ where: { documentTypeListItemId: id } });

    const totalRefs =
      unitCount + tenantCount + leaseCount + paymentCount + vendorCount + maintCount + expenseCount + docCount;

    if (totalRefs > 0) {
      throw new BadRequestException(
        `Cannot delete item because it is referenced by ${totalRefs} existing records. Please deactivate it instead.`,
      );
    }

    return this.prisma.listItem.delete({ where: { id } });
  }

  // List all ListTypes with items for Settings > Custom Lists tabs
  async getAllTypesWithItems(agencyId: string) {
    const globalTypes = await this.prisma.listType.findMany({
      where: { agencyId: null },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    const agencyTypes = await this.prisma.listType.findMany({
      where: { agencyId },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    const agencyMap = new Map(agencyTypes.map((t: any) => [t.key, t]));

    return globalTypes.map((gt: any) => {
      const customType = agencyMap.get(gt.key) as any;
      const customItems = customType?.items || [];
      return {
        key: gt.key,
        label: gt.label,
        items: [...(gt.items || []), ...customItems],
      };
    });
  }
}

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller()
export class ListTypesController {
  constructor(private service: ListTypesService) {}

  @Get('list-types/all')
  @RequirePermission('settings:view')
  async getAllTypes(@CurrentUser() user: any) {
    return this.service.getAllTypesWithItems(user.agencyId);
  }

  @Get('list-types/:key/items')
  async getItems(@Param('key') key: string, @CurrentUser() user: any) {
    return this.service.getItemsByKey(key, user?.agencyId);
  }

  @Post('list-types/:key/items')
  async createItem(
    @Param('key') key: string,
    @CurrentUser() user: any,
    @Body() body: { label: string; value?: string },
  ) {
    return this.service.createCustomItem(key, user.agencyId, user.id, body);
  }

  @Patch('list-items/:id')
  @RequirePermission('settings:edit')
  async updateItem(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    return this.service.updateItem(id, user.agencyId, body);
  }

  @Patch('list-items/:id/deactivate')
  @RequirePermission('settings:edit')
  async toggleStatus(@Param('id') id: string) {
    return this.service.toggleItemStatus(id);
  }

  @Patch('list-types/:key/items/:id/toggle')
  @RequirePermission('settings:edit')
  async toggleStatusAlias(@Param('id') id: string) {
    return this.service.toggleItemStatus(id);
  }

  @Delete('list-items/:id')
  @RequirePermission('settings:edit')
  async deleteItem(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.deleteItem(id, user.agencyId);
  }

  @Delete('list-types/:key/items/:id')
  @RequirePermission('settings:edit')
  async deleteItemAlias(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.deleteItem(id, user.agencyId);
  }
}

@Module({
  controllers: [ListTypesController],
  providers: [ListTypesService],
  exports: [ListTypesService],
})
export class ListTypesModule {}
