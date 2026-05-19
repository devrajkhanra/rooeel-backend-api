import {
    Controller,
    Post,
    Delete,
    Get,
    Param,
    UploadedFile,
    UseInterceptors,
    UseGuards,
    Request,
    ParseIntPipe,
    BadRequestException,
    Body,
    Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ProjectService } from './services/project.service';
import { RestAdminGuard } from '../auth/guards/rest-admin.guard';
import type { Response } from 'express';

@Controller('project')
export class ProjectController {
    constructor(private readonly projectService: ProjectService) { }

    @UseGuards(RestAdminGuard)
    @Post(':id/work-order')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: memoryStorage(),
            fileFilter: (req, file, cb) => {
                if (file.mimetype !== 'application/pdf') {
                    return cb(new BadRequestException('Only PDF files are allowed'), false);
                }
                cb(null, true);
            },
            limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
        }),
    )
    uploadWorkOrder(
        @Param('id', ParseIntPipe) id: number,
        @UploadedFile() file: Express.Multer.File,
        @Body('name') name: string | undefined,
        @Request() req: any,
    ) {
        if (!file) throw new BadRequestException('No file provided');
        const adminId = req.user.userId;
        return this.projectService.uploadWorkOrder(id, adminId, file, name);
    }

    @UseGuards(RestAdminGuard)
    @Delete(':projectId/work-order/:workOrderId')
    deleteWorkOrder(
        @Param('workOrderId', ParseIntPipe) workOrderId: number,
    ) {
        return this.projectService.deleteWorkOrder(workOrderId);
    }

    @UseGuards(RestAdminGuard)
    @Get(':projectId/work-order/:workOrderId/view')
    async viewWorkOrder(
        @Param('projectId', ParseIntPipe) projectId: number,
        @Param('workOrderId', ParseIntPipe) workOrderId: number,
        @Res() res: Response,
    ) {
        const { stream, fileName } = await this.projectService.getWorkOrderForViewing(projectId, workOrderId);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
        stream.pipe(res);
    }
}
