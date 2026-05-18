import { Module } from '@nestjs/common';
import { PasswordResetService } from '../common/services/password-reset.service';
import { PasswordResetController } from './password-reset.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';

@Module({
    imports: [PrismaModule, CommonModule],
    controllers: [PasswordResetController],
    providers: [PasswordResetService],
    exports: [PasswordResetService],
})
export class PasswordResetModule { }