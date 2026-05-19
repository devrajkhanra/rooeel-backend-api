import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto } from '../dto/create-project.input';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { StorageService } from 'src/storage/storage.service';

@Injectable()
export class ProjectService {
    constructor(private prisma: PrismaService, private storage: StorageService) { }

    async create(adminId: number, createProjectDto: CreateProjectDto) {
        return this.prisma.project.create({
            data: {
                ...createProjectDto,
                createdBy: adminId, // Strictly associate the project with the Admin creating it
            },
            include: {
                admin: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
            },
        });
    }

    async findAll() {
        return this.prisma.project.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { users: true, tasks: true }, // Returns a count of assigned users and tasks
                },
            },
        });
    }

    async findOne(id: number) {
        const project = await this.prisma.project.findUnique({
            where: { id },
            include: {
                admin: { select: { id: true, firstName: true, lastName: true } },
                users: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
                fields: true,
            },
        });

        if (!project) {
            throw new NotFoundException(`Project with ID ${id} not found`);
        }
        return project;
    }

    async update(id: number, updateProjectDto: UpdateProjectDto) {
        // First check if it exists
        await this.findOne(id);

        return this.prisma.project.update({
            where: { id },
            data: updateProjectDto,
        });
    }

    async remove(id: number) {
        // First check if it exists
        await this.findOne(id);

        // Because of onDelete: Cascade in your schema, deleting the project 
        // will safely delete all linked ProjectUsers, Tasks, and FieldValues.
        return this.prisma.project.delete({
            where: { id },
        });
    }

    async uploadWorkOrder(projectId: number, file: Express.Multer.File) {
        const project = await this.prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundException('Project not found');

        // If an old PDF exists, delete it from S3/MinIO to save space
        if (project.workOrderPdf) {
            await this.storage.deleteFile(project.workOrderPdf);
        }

        // Upload new file
        const fileKey = await this.storage.uploadFile(file);

        // Update DB
        const updatedProject = await this.prisma.project.update({
            where: { id: projectId },
            data: { workOrderPdf: fileKey },
        });

        return {
            ...updatedProject,
            workOrderUrl: this.storage.getFileUrl(fileKey),
        };
    }

    async deleteWorkOrder(projectId: number) {
        const project = await this.prisma.project.findUnique({ where: { id: projectId } });
        if (!project || !project.workOrderPdf) return { success: true };

        // Delete from S3/MinIO
        await this.storage.deleteFile(project.workOrderPdf);

        // Update DB
        await this.prisma.project.update({
            where: { id: projectId },
            data: { workOrderPdf: null },
        });

        return { success: true };
    }

    // --- DYNAMIC FIELDS ---
    async getFields(projectId: number) {
        return this.prisma.projectField.findMany({
            where: { projectId },
            orderBy: { sortOrder: 'asc' },
            include: { value: true }
        });
    }

    async createField(projectId: number, data: any) {
        return this.prisma.projectField.create({
            data: {
                ...data,
                projectId
            }
        });
    }

    async deleteField(fieldId: number) {
        return this.prisma.projectField.delete({
            where: { id: fieldId }
        });
    }

    // --- DYNAMIC FIELD VALUES ---
    async saveFieldValue(projectId: number, fieldId: number, value: string) {
        return this.prisma.projectFieldValue.upsert({
            where: { fieldId },
            update: { value },
            create: { fieldId, projectId, value }
        });
    }

    // --- PROJECT USERS (MEMBERS) ---
    async getUsers(projectId: number) {
        return this.prisma.projectUser.findMany({
            where: { projectId },
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true, email: true }
                }
            }
        });
    }

    async assignUser(projectId: number, userId: number, role: string = 'member') {
        return this.prisma.projectUser.create({
            data: { projectId, userId, role },
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true, email: true }
                }
            }
        });
    }

    async unassignUser(projectId: number, userId: number) {
        return this.prisma.projectUser.delete({
            where: {
                projectId_userId: { projectId, userId }
            }
        });
    }

    // --- TASKS ---
    async getTasks(projectId: number) {
        return this.prisma.task.findMany({
            where: { projectId },
            include: {
                assignee: {
                    select: { id: true, firstName: true, lastName: true, email: true }
                }
            }
        });
    }

    async createTask(projectId: number, data: any) {
        return this.prisma.task.create({
            data: {
                ...data,
                projectId
            },
            include: {
                assignee: {
                    select: { id: true, firstName: true, lastName: true, email: true }
                }
            }
        });
    }

    async deleteTask(taskId: number) {
        return this.prisma.task.delete({
            where: { id: taskId }
        });
    }
}