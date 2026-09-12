import {
  Module,
  Global,
  Injectable,
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
  CanActivate,
  CallHandler,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule, AuthGuard, PassportStrategy } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { Strategy, ExtractJwt } from 'passport-jwt';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { IsEmail, IsString, MinLength, MaxLength, IsOptional, Matches } from 'class-validator';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailService } from '../supporting/email.service.js';
import { UserStatus } from '@prisma/client';

// =============================================================
// DTOs — Validated request bodies
// =============================================================

export class LoginDto {
  @IsEmail({}, { message: 'Please provide a valid corporate email.' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  @MaxLength(128)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, { message: 'Password must contain uppercase, lowercase, and numbers/symbols' })
  password: string;
}

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  agencyName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsEmail({}, { message: 'Please provide a valid corporate email.' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  @MaxLength(128)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, { message: 'Password must contain uppercase, lowercase, and numbers/symbols' })
  password: string;

  @IsOptional()
  @IsString()
  tradeLicense?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Please provide a valid corporate email.' })
  email: string;
}

export class ResetPasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  token: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  @MaxLength(128)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, { message: 'Password must contain uppercase, lowercase, and numbers/symbols' })
  newPassword: string;
}

export class RefreshDto {
  @IsString()
  refreshToken: string;
}

// =============================================================
// JWT Payload & Decorators
// =============================================================

export interface JwtPayload {
  userId: string;
  agencyId: string;
  email: string;
  roleId: string;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

export const PERMISSION_KEY = 'permission';
export const RequirePermission = (permission: string) =>
  SetMetadata(PERMISSION_KEY, permission);

// =============================================================
// Permission Guard — RBAC
// =============================================================

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.getAllAndOverride<string>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role || !user.role.permissions) {
      throw new ForbiddenException('User permissions could not be verified.');
    }

    const [moduleName, action] = requiredPermission.split(':');
    const permissions = user.role.permissions as Record<string, Record<string, boolean>>;

    if (!permissions[moduleName] || permissions[moduleName][action] !== true) {
      throw new ForbiddenException(
        `Insufficient permissions. Role '${user.role.name}' cannot perform '${action}' on '${moduleName}'.`,
      );
    }

    return true;
  }
}

// =============================================================
// Audit Log Interceptor — Auto-logs all mutations
// =============================================================

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    return next.handle().pipe(
      tap(async (response) => {
        if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method) && request.user) {
          try {
            const path = request.route?.path || request.url;
            const action = `${method.toLowerCase()} ${path}`;
            const entityType = path.split('/')[1] || 'Unknown';
            const entityId = response?.id || request.params?.id || 'unknown';

            await this.prisma.auditLog.create({
              data: {
                agencyId: request.user.agencyId,
                userId: request.user.id,
                action,
                entityType,
                entityId: String(entityId),
                metadata: {
                  body: request.body ? Object.keys(request.body) : [],
                  status: 'SUCCESS',
                },
              },
            });
          } catch {
            // Non-blocking audit failure
          }
        }
      }),
    );
  }
}

// =============================================================
// JWT Strategy
// =============================================================

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('FATAL: JWT_SECRET environment variable is not set. Cannot start server.');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        role: true,
        agency: { include: { plan: true } },
      },
    });

    if (!user || user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Account suspended or invalid credentials.');
    }

    return {
      id: user.id,
      userId: user.id,
      email: user.email,
      name: user.name,
      agencyId: user.agencyId,
      agency: user.agency,
      roleId: user.roleId,
      role: user.role,
      status: user.status,
    };
  }
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

// =============================================================
// Auth Service
// =============================================================

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  private signTokens(userId: string, agencyId: string, email: string, roleId: string) {
    const accessSecret = process.env.JWT_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    const payload = { userId, agencyId, email, roleId };
    
    const accessToken = this.jwtService.sign(payload, { secret: accessSecret, expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { secret: refreshSecret, expiresIn: '7d' });
    
    return { accessToken, refreshToken };
  }

  async register(data: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingUser) {
      throw new ConflictException('A user with this corporate email already exists.');
    }

    // Fetch or create Freemium plan
    let plan = await this.prisma.subscriptionPlan.findFirst({
      where: { name: 'Freemium' },
    });
    if (!plan) {
      plan = await this.prisma.subscriptionPlan.create({
        data: { name: 'Freemium', priceQar: 0, unitLimit: 5 },
      });
    }

    // Create Agency
    const agency = await this.prisma.agency.create({
      data: {
        name: data.agencyName,
        tradeLicense: data.tradeLicense || 'CR-PENDING',
        address: data.address || 'Doha, Qatar',
        planId: plan.id,
        unitLimit: plan.unitLimit,
      },
    });

    // Clone system roles
    const systemRoles = await this.prisma.role.findMany({
      where: { agencyId: null, isSystemRole: true },
    });

    let ownerRole: any = null;

    if (systemRoles.length > 0) {
      for (const sysRole of systemRoles) {
        const cloned = await this.prisma.role.create({
          data: {
            agencyId: agency.id,
            name: sysRole.name,
            isSystemRole: false,
            permissions: sysRole.permissions as any,
          },
        });
        if (sysRole.name.toLowerCase() === 'owner') ownerRole = cloned;
      }
    } else {
      ownerRole = await this.prisma.role.create({
        data: {
          agencyId: agency.id,
          name: 'Owner',
          isSystemRole: false,
          permissions: {
            properties: { view: true, create: true, edit: true, delete: true },
            tenants: { view: true, create: true, edit: true, delete: true },
            leases: { view: true, create: true, edit: true, delete: true, approve: true },
            payments: { view: true, create: true, edit: true, delete: true },
            maintenance: { view: true, create: true, edit: true, delete: true },
            vendors: { view: true, create: true, edit: true, delete: true },
            reports: { view: true, export: true },
            settings: { view: true, edit: true },
            users: { view: true, create: true, edit: true, delete: true },
            billing: { view: true, edit: true },
          },
        },
      });
    }

    const passwordHash = await bcrypt.hash(data.password, 12); // Cost factor 12 for production
    const user = await this.prisma.user.create({
      data: {
        agencyId: agency.id,
        roleId: ownerRole.id,
        name: data.name,
        email: data.email,
        passwordHash,
        status: UserStatus.ACTIVE,
        lastLoginAt: new Date(),
      },
      include: { role: true },
    });

    await this.prisma.auditLog.create({
      data: {
        agencyId: agency.id,
        userId: user.id,
        action: 'agency.register',
        entityType: 'Agency',
        entityId: agency.id,
        metadata: { agencyName: agency.name, plan: plan.name },
      },
    });

    const tokens = this.signTokens(user.id, agency.id, user.email, user.roleId);
    return { ...tokens, user: { id: user.id, email: user.email, name: user.name, agencyId: agency.id }, role: user.role, agency };
  }

  async login(data: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
      include: { role: true, agency: { include: { plan: true } } },
    });

    if (!user || !user.passwordHash) {
      // Constant-time response to prevent timing attacks
      await bcrypt.compare('dummy', '$2a$12$dummyhash.dummyhash.dummyhash.dummyhashXXXXXX');
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('This account has been suspended. Contact your administrator.');
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = this.signTokens(user.id, user.agencyId, user.email, user.roleId);
    return {
      ...tokens,
      user: { id: user.id, email: user.email, name: user.name, agencyId: user.agencyId, roleId: user.roleId, status: user.status },
      role: user.role,
      agency: user.agency,
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, agency: { include: { plan: true } } },
    });
    if (!user) throw new UnauthorizedException('User not found.');
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      agencyId: user.agencyId,
      status: user.status,
      roleId: user.roleId,
      role: user.role,
      agency: user.agency,
    };
  }

  async forgotPassword(data: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      // Return success anyway to prevent email enumeration — never reveal if email exists
      return { message: 'If that email is registered, a reset link has been sent.' };
    }

    // Generate cryptographically secure token (Fix 3)
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, 10); // Store only the hash
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 1); // 1 hour expiry

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: tokenHash,
        resetTokenExpiry: expiry,
      },
    });

    // Send real password reset email (Fix 4)
    const frontendOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
    const resetUrl = `${frontendOrigin}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;
    await this.emailService.sendPasswordReset(user.email, user.name, resetUrl);

    return { message: 'If that email is registered, a reset link has been sent.' };
  }

  async resetPassword(data: ResetPasswordDto & { email: string }) {
    // Find user by email first, then verify token hash (Fix 3: hashed token comparison)
    const user = await this.prisma.user.findFirst({
      where: {
        email: data.email,
        resetTokenExpiry: { gt: new Date() },
        resetToken: { not: null },
      },
    });

    if (!user || !user.resetToken) {
      throw new UnauthorizedException('Invalid or expired reset token.');
    }

    // Verify raw token against stored bcrypt hash
    const tokenValid = await bcrypt.compare(data.token, user.resetToken);
    if (!tokenValid) {
      throw new UnauthorizedException('Invalid or expired reset token.');
    }

    const passwordHash = await bcrypt.hash(data.newPassword, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,      // Invalidate token after single use
        resetTokenExpiry: null,
      },
    });

    return { message: 'Password has been successfully reset.' };
  }

  async refresh(data: RefreshDto) {
    try {
      // Use JWT_REFRESH_SECRET for refresh tokens (Fix 6)
      const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
      const payload = this.jwtService.verify(data.refreshToken, { secret: refreshSecret });
      
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user || user.status === UserStatus.SUSPENDED) {
        throw new UnauthorizedException('Invalid or expired refresh token.');
      }

      return this.signTokens(user.id, user.agencyId, user.email, user.roleId);
    } catch (_e) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }
  }
}

// =============================================================
// Auth Controller — Throttled
// =============================================================

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // Rate limit: 5 requests per minute on auth endpoints (brute-force protection)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  async login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  // Fix 9: Stricter rate limit — 3 requests per hour max to prevent email provider abuse and account enumeration
  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body);
  }

  @Post('refresh')
  async refresh(@Body() body: RefreshDto) {
    return this.authService.refresh(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: any) {
    return this.authService.getMe(user.id);
  }
}

// =============================================================
// Auth Module
// =============================================================

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('FATAL: JWT_SECRET not set.');
        return { secret, signOptions: { expiresIn: '15m' } };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, EmailService, JwtStrategy, JwtAuthGuard, PermissionGuard, AuditInterceptor],
  exports: [AuthService, EmailService, JwtStrategy, JwtAuthGuard, PassportModule, JwtModule, PermissionGuard, AuditInterceptor],
})
export class AuthModule {}
