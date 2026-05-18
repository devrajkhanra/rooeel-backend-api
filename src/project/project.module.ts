import { Module } from '@nestjs/common';
import { ProjectService } from './services/project.service';
import { ProjectController } from './project.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule], // Allows ProjectService to use Prisma
    controllers: [ProjectController],
    providers: [ProjectService],
    exports: [ProjectService], // Exported in case other modules (like Tasks) need to verify project data
})
export class ProjectModule { }