import { Module } from '@nestjs/common';
import { PasswordService } from './services/password.service';
import { EmailService } from './services/email.service';

@Module({
    providers: [PasswordService, EmailService],
    exports: [PasswordService, EmailService],
})
export class CommonModule { }
