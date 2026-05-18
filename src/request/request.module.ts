import { Module } from '@nestjs/common';
import { RequestService } from './services/request.service';
import { RequestController } from './request.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';

@Module({
    imports: [PrismaModule, CommonModule],
    controllers: [RequestController],
    providers: [RequestService],
    exports: [RequestService],
})
export class RequestModule { }
