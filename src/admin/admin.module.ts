import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './services/admin.service';
import { CommonModule } from '../common/common.module';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [CommonModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule { }
