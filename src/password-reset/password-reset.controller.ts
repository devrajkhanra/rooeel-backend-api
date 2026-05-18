import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { PasswordResetService } from '../common/services/password-reset.service';
import { ForgotPasswordDto } from '../request/dto/forgot-password.dto';
import { ResetPasswordDto } from '../request/dto/reset-password.dto';

@Controller('password-reset')
export class PasswordResetController {
    constructor(private readonly passwordResetService: PasswordResetService) { }

    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    forgotPassword(@Body() dto: ForgotPasswordDto) {
        return this.passwordResetService.requestReset(dto.email);
    }

    @Post('reset')
    @HttpCode(HttpStatus.OK)
    resetPassword(@Body() dto: ResetPasswordDto) {
        return this.passwordResetService.resetPassword(dto.token, dto.newPassword);
    }
}