import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './services/user.service';
import { CommonModule } from '../common/common.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule, CommonModule],
    controllers: [UserController],
    providers: [UserService],
    exports: [UserService],
})
export class UserModule { }
