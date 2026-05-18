import { IsEmail } from 'class-validator';

/**
 * DTO for the forgot-password (unauthenticated password reset) flow.
 * The user provides their email; the system looks up their assigned admin
 * and creates a pending password_reset request.
 */
export class ForgotPasswordDto {
    @IsEmail()
    email: string;
}
