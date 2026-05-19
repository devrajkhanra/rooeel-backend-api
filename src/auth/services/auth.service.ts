import { Inject, Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminService } from '../../admin/services/admin.service';
import { UserService } from '../../user/services/user.service';
import { PasswordService } from '../../common/services/password.service';
import { EmailService } from '../../common/services/email.service';
import { LoginInput } from '../dto/login.input';
import { SignupInput } from '../dto/signup.input';
import { IAuthService } from '../interfaces/auth.interface';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    refreshExpiresIn: number;
}

@Injectable()
export class AuthService implements IAuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        private adminService: AdminService,
        private userService: UserService,
        private jwtService: JwtService,
        private passwordService: PasswordService,
        private configService: ConfigService,
        private prisma: PrismaService,
        private emailService: EmailService,
    ) { }

    private async generateTokens(user: { id: number; email: string; role: string }): Promise<TokenPair> {
        const jti = uuidv4();

        const accessToken = this.jwtService.sign(
            { sub: user.id, email: user.email, role: user.role, jti, type: 'access' },
            {
                secret: this.configService.get('JWT_SECRET'),
                expiresIn: this.configService.get('JWT_ACCESS_EXPIRY') || '15m',
            }
        );

        const refreshToken = this.jwtService.sign(
            { sub: user.id, email: user.email, role: user.role, jti, type: 'refresh' },
            {
                secret: this.configService.get('JWT_SECRET'),
                expiresIn: this.configService.get('JWT_REFRESH_EXPIRY') || '7d',
            }
        );

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        await this.prisma.refreshToken.create({
            data: {
                token: tokenHash,
                userId: user.id,
                userType: user.role,
                expiresAt,
            },
        });

        const accessExpiry = this.configService.get('JWT_ACCESS_EXPIRY') || '15m';
        const refreshExpiry = this.configService.get('JWT_REFRESH_EXPIRY') || '7d';

        return {
            accessToken,
            refreshToken,
            expiresIn: this.parseExpiry(accessExpiry),
            refreshExpiresIn: this.parseExpiry(refreshExpiry),
        };
    }

    private parseExpiry(expiry: string): number {
        const match = expiry.match(/^(\d+)([smhd])$/);
        if (!match) return 900;
        const value = parseInt(match[1], 10);
        const unit = match[2];
        switch (unit) {
            case 's': return value;
            case 'm': return value * 60;
            case 'h': return value * 60 * 60;
            case 'd': return value * 60 * 60 * 24;
            default: return 900;
        }
    }

    async refreshTokens(refreshToken: string): Promise<TokenPair> {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.get('JWT_SECRET'),
            });

            if (payload.type !== 'refresh') {
                throw new UnauthorizedException('Invalid token type');
            }

            const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

            const storedToken = await this.prisma.refreshToken.findUnique({
                where: { token: tokenHash },
            });

            if (!storedToken || storedToken.revokedAt) {
                throw new UnauthorizedException('Token has been revoked or does not exist');
            }

            if (storedToken.expiresAt < new Date()) {
                throw new UnauthorizedException('Token has expired');
            }

            await this.prisma.refreshToken.update({
                where: { id: storedToken.id },
                data: { revokedAt: new Date() },
            });

            const user = storedToken.userType === 'admin'
                ? await this.adminService.findOne(payload.sub)
                : await this.userService.findOne(payload.sub);

            if (!user) {
                throw new UnauthorizedException('User not found');
            }

            return this.generateTokens({ id: user.id, email: user.email, role: storedToken.userType });

        } catch (error) {
            if (error instanceof UnauthorizedException) throw error;
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    async logout(accessToken: string, user: any): Promise<{ message: string }> {
        try {
            if (accessToken && user.jti) {
                const decoded = this.jwtService.decode(accessToken);
                if (decoded && decoded['jti']) {
                    const exp = decoded['exp'] * 1000;
                    // ttl is born right here!
                    const ttl = Math.max(0, Math.floor((exp - Date.now()) / 1000));

                    if (ttl > 0) {
                        // The cache instruction must go INSIDE this block with ttl
                        await this.cacheManager.set(`bl_${accessToken}`, true, ttl * 1000);
                    }
                }
            }

            if (user.userId) {
                await this.prisma.refreshToken.updateMany({
                    where: { userId: user.userId },
                    data: { revokedAt: new Date() },
                });
            }

            this.logger.log(`User ${user.email} (ID: ${user.userId}) logged out successfully`);
            return { message: 'Logout successful' };

        } catch (error) {
            this.logger.error(`Logout error: ${error.message}`);
            return { message: 'Logout successful' };
        }
    }

    async signup(signupInput: SignupInput) {
        const existingAdmin = await this.adminService.findByEmail(signupInput.email);
        if (existingAdmin) {
            throw new ConflictException('Admin with this email already exists');
        }

        const admin = await this.adminService.create(signupInput);
        const tokens = await this.generateTokens({ id: admin.id, email: admin.email, role: 'admin' });

        return {
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken,
            expiresIn: tokens.expiresIn,
            admin: {
                id: admin.id,
                firstName: admin.firstName,
                lastName: admin.lastName,
                email: admin.email,
            },
        };
    }

    async validateAdmin(email: string, pass: string): Promise<any> {
        const admin = await this.adminService.findByEmail(email);
        if (admin && await this.passwordService.compare(pass, admin.password)) {
            const { password, ...result } = admin;
            return result;
        }
        return null;
    }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.userService.findByEmail(email);
        if (user && await this.passwordService.compare(pass, user.password)) {
            const { password, ...result } = user;
            return result;
        }
        return null;
    }

    async login(loginInput: LoginInput) {
        let user: any;
        const role = loginInput.role || 'user';

        if (role === 'admin') {
            user = await this.validateAdmin(loginInput.email, loginInput.password);
        } else if (role === 'user') {
            user = await this.validateUser(loginInput.email, loginInput.password);
        }

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const tokens = await this.generateTokens({ id: user.id, email: user.email, role });
        return {
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken,
            expiresIn: tokens.expiresIn,
            user: { ...user, role },
        };
    }

    async loginUser(loginInput: LoginInput) {
        const user = await this.validateUser(loginInput.email, loginInput.password);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }
        const tokens = await this.generateTokens({ id: user.id, email: user.email, role: 'user' });
        return {
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken,
            expiresIn: tokens.expiresIn,
        };
    }

    async forgotPassword(email: string): Promise<{ message: string }> {
        // Look up the user (users only — admins have internal access)
        const user = await this.userService.findByEmail(email);

        // Always return success to prevent email enumeration attacks
        if (!user) return { message: 'If that email exists, a reset link has been sent.' };

        // Invalidate any existing reset tokens for this email
        await this.prisma.passwordResetToken.deleteMany({ where: { email } });

        // Generate a secure random token
        const rawToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await this.prisma.passwordResetToken.create({
            data: { email, token: rawToken, expiresAt },
        });

        const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
        const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`;

        await this.emailService.sendPasswordResetEmail(user.email, user.firstName, resetLink, true);

        this.logger.log(`Password reset link sent to ${email}`);
        return { message: 'If that email exists, a reset link has been sent.' };
    }

    async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
        const record = await this.prisma.passwordResetToken.findUnique({ where: { token } });

        if (!record) throw new BadRequestException('Invalid or expired reset token');
        if (record.usedAt) throw new BadRequestException('Reset token has already been used');
        if (record.expiresAt < new Date()) throw new BadRequestException('Reset token has expired');

        const user = await this.userService.findByEmail(record.email);
        if (!user) throw new BadRequestException('User not found');

        const hashedPassword = await this.passwordService.hash(newPassword);
        await this.prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword },
        });

        // Mark token as used
        await this.prisma.passwordResetToken.update({
            where: { token },
            data: { usedAt: new Date() },
        });

        this.logger.log(`Password reset successfully for ${record.email}`);
        return { message: 'Password reset successfully. You can now log in.' };
    }
}
