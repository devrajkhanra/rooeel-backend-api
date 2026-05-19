import { Module } from '@nestjs/common';
import { ProjectService } from './services/project.service';
import { ProjectResolver } from './project.resolver';
import { ProjectController } from './project.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [PrismaModule, StorageModule, AuthModule],
    controllers: [ProjectController],
    providers: [ProjectResolver, ProjectService],
    exports: [ProjectService],
})
export class ProjectModule { }