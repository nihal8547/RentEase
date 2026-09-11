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
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtAuthGuard, CurrentUser, RequirePermission, PermissionGuard } from '../auth/auth.module.js';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // List all team members for the agency
  async getAgencyUsers(agencyId: string) {
    return this.prisma.user.findMany({
      where: { agencyId },
      include: {
        role: true,
      },
      orderBy: { invitedAt: 'desc' },
    });
  }

  // Invite team member
  async inviteUser(
    agencyId: string,
    inviterId: string,
    data: { name: string; email: string; roleId: string },
  ) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      throw new ConflictException('A user with this email address already exists.');
    }

    const role = await this.prisma.role.findFirst({
      where: { id: data.roleId, OR: [{ agencyId }, { agencyId: null }] },
    });
    if (!role) {
      throw new BadRequestException('Invalid role specified.');
    }

    const user = await this.prisma.user.create({
      data: {
        agencyId,
        roleId: role.id,
        name: data.name,
        email: data.email,
        status: 'INVITED' as any,
        invitedAt: new Date(),
      },
      include: { role: true },
    });

    // Generate 7-day invite token
    const inviteToken = this.jwtService.sign(
      { userId: user.id, email: user.email, type: 'invite' },
      { expiresIn: '7d' },
    );

    const inviteLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/accept-invite?token=${inviteToken}`;

    return {
      user,
      inviteToken,
      inviteLink,
      message: `Invitation generated for ${user.email}. Send link to set password.`,
    };
  }

  // Accept invitation and set password
  async acceptInvite(data: { token?: string; inviteToken?: string; password: string; name?: string }) {
    if (!data.password || data.password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters long.');
    }

    const rawToken = data.token || data.inviteToken;
    if (!rawToken) {
      throw new BadRequestException('Invitation token is required.');
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(rawToken);
    } catch {
      throw new BadRequestException('Invalid or expired invitation token.');
    }

    if (payload.type !== 'invite') {
      throw new BadRequestException('Invalid token type.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      include: { role: true, agency: true },
    });

    if (!user) {
      throw new NotFoundException('Invited user not found.');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const updateData: any = {
      passwordHash,
      status: 'ACTIVE' as any,
      lastLoginAt: new Date(),
    };
    if (data.name && data.name.trim()) {
      updateData.name = data.name.trim();
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: updateData,
      include: { role: true, agency: true },
    });

    // Issue standard session token
    const token = this.jwtService.sign({
      userId: updatedUser.id,
      agencyId: updatedUser.agencyId,
      email: updatedUser.email,
      roleId: updatedUser.roleId,
    });

    return {
      token,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        agencyId: updatedUser.agencyId,
        roleId: updatedUser.roleId,
        status: updatedUser.status,
      },
      role: updatedUser.role,
      agency: updatedUser.agency,
    };
  }

  // Change user role
  async changeRole(id: string, agencyId: string, roleId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, agencyId },
      include: { role: true },
    });
    if (!user) throw new NotFoundException('User not found.');

    const newRole = await this.prisma.role.findFirst({
      where: { id: roleId, OR: [{ agencyId }, { agencyId: null }] },
    });
    if (!newRole) throw new BadRequestException('Invalid target role.');

    // If changing away from Owner, check if they are the last Owner
    if (user.role.name.toLowerCase() === 'owner' && newRole.name.toLowerCase() !== 'owner') {
      const ownerCount = await this.prisma.user.count({
        where: { agencyId, role: { name: 'Owner' }, status: 'ACTIVE' as any },
      });
      if (ownerCount <= 1) {
        throw new ForbiddenException('Cannot remove the last active Owner from the agency.');
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: { roleId: newRole.id },
      include: { role: true },
    });
  }

  // Suspend / reactivate member
  async toggleSuspend(id: string, agencyId: string, requestingUserId: string) {
    if (id === requestingUserId) {
      throw new ForbiddenException('You cannot suspend your own account.');
    }

    const user = await this.prisma.user.findFirst({
      where: { id, agencyId },
      include: { role: true },
    });
    if (!user) throw new NotFoundException('User not found.');

    const newStatus =
      (user.status as string) === 'SUSPENDED' ? ('ACTIVE' as any) : ('SUSPENDED' as any);

    return this.prisma.user.update({
      where: { id },
      data: { status: newStatus },
      include: { role: true },
    });
  }

  // Delete user (disallows deleting last Owner)
  async deleteUser(id: string, agencyId: string, requestingUserId: string) {
    if (id === requestingUserId) {
      throw new ForbiddenException('You cannot delete your own account.');
    }

    const user = await this.prisma.user.findFirst({
      where: { id, agencyId },
      include: { role: true },
    });
    if (!user) throw new NotFoundException('User not found.');

    if (user.role.name.toLowerCase() === 'owner') {
      const ownerCount = await this.prisma.user.count({
        where: { agencyId, role: { name: 'Owner' }, status: 'ACTIVE' as any },
      });
      if (ownerCount <= 1) {
        throw new ForbiddenException('Cannot delete the last Owner of the agency.');
      }
    }

    return this.prisma.user.delete({ where: { id } });
  }
}

@Controller('users')
export class UsersController {
  constructor(private service: UsersService) {}

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Get()
  @RequirePermission('users:view')
  async getUsers(@CurrentUser() user: any) {
    return this.service.getAgencyUsers(user.agencyId);
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Post('invite')
  @RequirePermission('users:create')
  async invite(
    @CurrentUser() user: any,
    @Body() body: { name: string; email: string; roleId: string },
  ) {
    return this.service.inviteUser(user.agencyId, user.id, body);
  }

  // Public endpoint to accept invite token and set password
  @Post('accept-invite')
  async acceptInvite(@Body() body: { token: string; password: string }) {
    return this.service.acceptInvite(body);
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Patch(':id/role')
  @RequirePermission('users:edit')
  async changeRole(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('roleId') roleId: string,
  ) {
    return this.service.changeRole(id, user.agencyId, roleId);
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Patch(':id/suspend')
  @RequirePermission('users:edit')
  async toggleSuspend(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.toggleSuspend(id, user.agencyId, user.id);
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Patch(':id/status')
  @RequirePermission('users:edit')
  async toggleStatus(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.toggleSuspend(id, user.agencyId, user.id);
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Delete(':id')
  @RequirePermission('users:delete')
  async deleteUser(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.deleteUser(id, user.agencyId, user.id);
  }
}

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'rentease_super_secret_jwt_key_2026_qatar_saas',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
