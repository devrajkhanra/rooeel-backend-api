import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { CustomLogger } from '../../logger/logger.service';

@Injectable()
export class EmailService {
    private readonly logger: CustomLogger;
    private resend: Resend;

    constructor() {
        this.logger = new CustomLogger();
        this.logger.setContext(EmailService.name);

        this.resend = new Resend(process.env.RESEND_API_KEY);
    }

    async sendPasswordResetEmail(
        toEmail: string,
        firstName: string,
        temporaryPasswordOrLink: string,
        isLink: boolean = false,
    ): Promise<void> {
        const fromName = process.env.RESEND_FROM_NAME || 'Rooeel';
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

        const subject = isLink ? 'Reset Your Password' : 'Your Temporary Password';
        const htmlContent = isLink
            ? this.buildResetLinkEmail(firstName, temporaryPasswordOrLink)
            : this.buildTemporaryPasswordEmail(firstName, temporaryPasswordOrLink);

        try {
            await this.resend.emails.send({
                from: `${fromName} <${fromEmail}>`,
                to: toEmail,
                subject,
                html: htmlContent,
            });
            this.logger.log(`Password reset email sent to ${toEmail}`);
        } catch (error) {
            this.logger.error(`Failed to send email to ${toEmail}`, error);
            throw error;
        }
    }

    private buildResetLinkEmail(firstName: string, resetLink: string): string {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333;">Hello ${firstName},</h2>
                <p style="color: #555; font-size: 16px;">
                    We received a request to reset your password. Click the button below to reset your password:
                </p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetLink}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                        Reset Password
                    </a>
                </div>
                <p style="color: #555; font-size: 14px;">
                    Or copy and paste this link into your browser:
                </p>
                <p style="color: #4F46E5; font-size: 14px; word-break: break-all;">
                    ${resetLink}
                </p>
                <p style="color: #888; font-size: 12px; margin-top: 30px;">
                    This link will expire in 1 hour. If you did not request a password reset, please ignore this email.
                </p>
            </div>
        `;
    }

    private buildTemporaryPasswordEmail(firstName: string, temporaryPassword: string): string {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333;">Hello ${firstName},</h2>
                <p style="color: #555; font-size: 16px;">
                    We received a request to reset your password. Here is your temporary password:
                </p>
                <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="font-size: 24px; font-weight: bold; color: #333; margin: 0; text-align: center; letter-spacing: 2px;">
                        ${temporaryPassword}
                    </p>
                </div>
                <p style="color: #555; font-size: 14px;">
                    Please use this temporary password to log in. You will be prompted to change it to a new password of your choice.
                </p>
                <p style="color: #888; font-size: 12px; margin-top: 30px;">
                    If you did not request this, please ignore this email. Your password has not been changed.
                </p>
            </div>
        `;
    }
}