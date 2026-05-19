import {
    Controller,
    Post,
    Delete,
    Param,
    UploadedFile,
    UseInterceptors,
    UseGuards,
    Request,
    ParseIntPipe,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ProjectService } from './services/project.service';
import { RestAdminGuard } from '../auth/guards/rest-admin.guard';

@Controller('projects')
export class ProjectController {
    constructor(private readonly projectService: ProjectService) { }

    /**
     * POST /projects/:id/work-order
     * Upload a Work Order PDF (multipart/form-data, field name: "file")
     * Requires Admin authentication (Bearer token).
     */
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
        @Request() req: any,
    ) {
        if (!file) throw new BadRequestException('No file provided');
        const adminId = req.user.userId;
        return this.projectService.uploadWorkOrder(id, adminId, file);
    }

    /**
     * DELETE /projects/:projectId/work-order/:workOrderId
     * Delete a specific Work Order PDF.
     * Requires Admin authentication (Bearer token).
     */
    @UseGuards(RestAdminGuard)
    @Delete(':projectId/work-order/:workOrderId')
    deleteWorkOrder(
        @Param('workOrderId', ParseIntPipe) workOrderId: number,
    ) {
        return this.projectService.deleteWorkOrder(workOrderId);
    }
}
