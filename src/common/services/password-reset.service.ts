import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../common/services/email.service';
import { PasswordService } from '../../common/services/password.service';
import { CustomLogger } from '../../logger/logger.service';
import * as crypto from 'crypto';

@Injectable()
export class PasswordResetService {
    private readonly logger: CustomLogger;

    constructor(
        private readonly prisma: PrismaService,
        private readonly emailService: EmailService,
        private readonly passwordService: PasswordService,
    ) {
        this.logger = new CustomLogger();
        this.logger.setContext(PasswordResetService.name);
    }

    async requestReset(email: string): Promise<{ message: string }> {
        const user = await this.prisma.user.findUnique({
            where: { email },
            include: { admin: true },
        });

        if (!user) {
            this.logger.debug(`Password reset attempt for non-existent email: ${email}`);
            // Always return success to prevent user enumeration
            return { message: 'If an account exists with this email, a password reset link has been sent.' };
        }

        // Clean up expired tokens for this email
        await this.prisma.passwordResetToken.deleteMany({
            where: {
                email,
                expiresAt: { lt: new Date() },
            },
        });

        // Delete any existing unused tokens for this email
        await this.prisma.passwordResetToken.deleteMany({
            where: {
                email,
                usedAt: null,
            },
        });

        // Generate a secure token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await this.prisma.passwordResetToken.create({
            data: {
                email,
                token,
                expiresAt,
            },
        });

        // Build the reset URL
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

        await this.emailService.sendPasswordResetEmail(user.email, user.firstName, resetUrl, true);

        this.logger.log(`Password reset email sent to ${email}`);
        return { message: 'If an account exists with this email, a password reset link has been sent.' };
    }

    async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
        const resetToken = await this.prisma.passwordResetToken.findUnique({
            where: { token },
        });

        if (!resetToken) {
            throw new NotFoundException('Invalid or expired reset token');
        }

        if (resetToken.usedAt) {
            throw new BadRequestException('This reset link has already been used');
        }

        if (resetToken.expiresAt < new Date()) {
            throw new BadRequestException('This reset link has expired');
        }

        // Find the user
        const user = await this.prisma.user.findUnique({
            where: { email: resetToken.email },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Hash the new password
        const hashed = await this.passwordService.hash(newPassword);

        // Update user's password
        await this.prisma.user.update({
            where: { id: user.id },
            data: { password: hashed },
        });

        // Mark token as used
        await this.prisma.passwordResetToken.update({
            where: { id: resetToken.id },
            data: { usedAt: new Date() },
        });

        this.logger.log(`Password reset completed for ${resetToken.email}`);
        return { message: 'Password has been reset successfully. You can now log in with your new password.' };
    }
}