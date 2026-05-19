import { Module } from '@nestjs/common';
import { AdminService } from './services/admin.service';
import { AdminResolver } from './admin.resolver';
import { CommonModule } from '../common/common.module';
import { PrismaModule } from '../prisma/prisma.module'; // Ensure Prisma logic maps correctly

@Module({
  imports: [CommonModule, PrismaModule],
  providers: [AdminResolver, AdminService], // Replaced AdminController with AdminResolver
  exports: [AdminService],
})
export class AdminModule { }