import { Module } from '@nestjs/common';
import { UserService } from './services/user.service';
import { UserResolver } from './user.resolver';
import { CommonModule } from '../common/common.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UserController } from './user.controller';

@Module({
    imports: [PrismaModule, CommonModule],
    controllers: [UserController],
    providers: [UserResolver, UserService],
    exports: [UserService],
})
export class UserModule { }
