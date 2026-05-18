import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';

@Injectable()
export class ProjectService {
    constructor(private prisma: PrismaService) { }

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
}