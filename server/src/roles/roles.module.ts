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
export class RolesService {
  constructor(private prisma: PrismaService) {}

  // List roles for agency with active member counts
  async getAgencyRoles(agencyId: string) {
    const roles = await this.prisma.role.findMany({
      where: { agencyId },
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return roles.map((r: any) => ({
      id: r.id,
      name: r.name,
      isSystemRole: r.isSystemRole,
      permissions: r.permissions,
      userCount: r._count.users,
    }));
  }

  // Create custom role
  async createRole(
    agencyId: string,
    data: { name: string; permissions: Record<string, any> },
  ) {
    if (!data.name || !data.name.trim()) {
      throw new BadRequestException('Role name is required.');
    }

    const existing = await this.prisma.role.findFirst({
      where: { agencyId, name: { equals: data.name.trim(), mode: 'insensitive' } },
    });
    if (existing) {
      throw new BadRequestException('A role with this name already exists in your agency.');
    }

    return this.prisma.role.create({
      data: {
        agencyId,
        name: data.name.trim(),
        isSystemRole: false,
        permissions: data.permissions || {},
      },
    });
  }

  // Edit role name and permissions
  async updateRole(
    id: string,
    agencyId: string,
    data: { name?: string; permissions?: Record<string, any> },
  ) {
    const role = await this.prisma.role.findFirst({
      where: { id, agencyId },
    });

    if (!role) {
      throw new NotFoundException('Role not found.');
    }

    return this.prisma.role.update({
      where: { id },
      data: {
        name: data.name?.trim() ?? role.name,
        permissions: data.permissions ?? (role.permissions as any),
      },
    });
  }

  // Delete custom role
  async deleteRole(id: string, agencyId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, agencyId },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found.');
    }

    if (role.isSystemRole) {
      throw new ForbiddenException('System default roles cannot be deleted.');
    }

    if (role._count.users > 0) {
      throw new BadRequestException(
        `Cannot delete role because ${role._count.users} active team members currently hold it. Reassign them first.`,
      );
    }

    return this.prisma.role.delete({ where: { id } });
  }
}

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('roles')
export class RolesController {
  constructor(private service: RolesService) {}

  @Get()
  @RequirePermission('settings:view')
  async getRoles(@CurrentUser() user: any) {
    return this.service.getAgencyRoles(user.agencyId);
  }

  @Post()
  @RequirePermission('settings:edit')
  async createRole(@CurrentUser() user: any, @Body() body: any) {
    return this.service.createRole(user.agencyId, body);
  }

  @Patch(':id')
  @RequirePermission('settings:edit')
  async updateRole(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    return this.service.updateRole(id, user.agencyId, body);
  }

  @Patch(':id/permissions')
  @RequirePermission('settings:edit')
  async updateRolePermissions(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    return this.service.updateRole(id, user.agencyId, body);
  }

  @Delete(':id')
  @RequirePermission('settings:edit')
  async deleteRole(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.deleteRole(id, user.agencyId);
  }
}

@Module({
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
