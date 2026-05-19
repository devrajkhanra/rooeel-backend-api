import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { CreateProjectInput } from '../dto/create-project.input';
import { UpdateProjectInput } from '../dto/update-project.input';
import { CreateFieldInput } from '../dto/create-field.input';

@Injectable()
export class ProjectService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly storage: StorageService,
    ) { }

    // ─── PROJECT CRUD ────────────────────────────────────────────

    async create(adminId: number, input: CreateProjectInput) {
        return this.prisma.project.create({
            data: { ...input, createdBy: adminId },
            include: {
                admin: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
        });
    }

    async findAll() {
        return this.prisma.project.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { users: true, tasks: true, workOrders: true } },
                admin: { select: { id: true, firstName: true, lastName: true } },
            },
        });
    }

    async findOne(id: number) {
        const project = await this.prisma.project.findUnique({
            where: { id },
            include: {
                admin: { select: { id: true, firstName: true, lastName: true } },
                fields: { orderBy: { sortOrder: 'asc' }, include: { value: true } },
                workOrders: { orderBy: { createdAt: 'desc' } },
                departments: true,
                roles: true,
                users: {
                    include: {
                        user: { select: { id: true, firstName: true, lastName: true, email: true } },
                        projectRole: true,
                        department: true,
                    },
                },
            },
        });
        if (!project) throw new NotFoundException(`Project with ID ${id} not found`);
        return project;
    }

    async update(id: number, input: UpdateProjectInput) {
        await this.findOne(id);
        return this.prisma.project.update({ where: { id }, data: input });
    }

    async remove(id: number) {
        await this.findOne(id);
        return this.prisma.project.delete({ where: { id } });
    }

    // ─── DYNAMIC FIELDS ─────────────────────────────────────────

    async getFields(projectId: number) {
        return this.prisma.projectField.findMany({
            where: { projectId },
            orderBy: { sortOrder: 'asc' },
            include: { value: true },
        });
    }

    async createField(projectId: number, input: CreateFieldInput) {
        return this.prisma.projectField.create({
            data: { projectId, ...input },
        });
    }

    async deleteField(fieldId: number) {
        await this.prisma.projectField.findUniqueOrThrow({ where: { id: fieldId } });
        await this.prisma.projectField.delete({ where: { id: fieldId } });
        return true;
    }

    async setFieldValue(projectId: number, fieldId: number, value: string) {
        return this.prisma.projectFieldValue.upsert({
            where: { fieldId },
            update: { value },
            create: { fieldId, projectId, value },
        });
    }

    // ─── PROJECT MEMBERS ─────────────────────────────────────────

    async getUsers(projectId: number) {
        return this.prisma.projectUser.findMany({
            where: { projectId },
            include: {
                user: { select: { id: true, firstName: true, lastName: true, email: true } },
                projectRole: true,
                department: true,
            },
        });
    }

    async assignUser(projectId: number, userId: number) {
        await this.findOne(projectId);
        const existing = await this.prisma.projectUser.findUnique({
            where: { projectId_userId: { projectId, userId } },
        });
        if (existing) throw new ConflictException('User is already assigned to this project');

        return this.prisma.projectUser.create({
            data: { projectId, userId },
            include: {
                user: { select: { id: true, firstName: true, lastName: true, email: true } },
                projectRole: true,
                department: true,
            },
        });
    }

    async unassignUser(projectId: number, userId: number) {
        await this.prisma.projectUser.delete({
            where: { projectId_userId: { projectId, userId } },
        });
        return true;
    }

    // ─── WORK ORDERS ─────────────────────────────────────────────

    async getWorkOrders(projectId: number) {
        const workOrders = await this.prisma.workOrderPdf.findMany({
            where: { projectId },
            orderBy: { createdAt: 'desc' },
        });
        return workOrders.map(wo => ({
            ...wo,
            fileUrl: this.storage.getFileUrl(wo.fileKey),
        }));
    }

    async uploadWorkOrder(projectId: number, adminId: number, file: Express.Multer.File) {
        await this.findOne(projectId);
        const fileKey = await this.storage.uploadFile(file, 'work-orders');
        const workOrder = await this.prisma.workOrderPdf.create({
            data: { projectId, fileKey, fileName: file.originalname, uploadedBy: adminId },
        });
        return { ...workOrder, fileUrl: this.storage.getFileUrl(fileKey) };
    }

    async deleteWorkOrder(workOrderId: number) {
        const wo = await this.prisma.workOrderPdf.findUniqueOrThrow({ where: { id: workOrderId } });
        await this.storage.deleteFile(wo.fileKey);
        await this.prisma.workOrderPdf.delete({ where: { id: workOrderId } });
        return true;
    }

    // ─── ROLES ───────────────────────────────────────────────────

    async getRoles(projectId: number) {
        return this.prisma.projectRole.findMany({ where: { projectId } });
    }

    async createRole(projectId: number, name: string) {
        return this.prisma.projectRole.create({ data: { projectId, name } });
    }

    async removeRole(id: number) {
        await this.prisma.projectRole.findUniqueOrThrow({ where: { id } });
        await this.prisma.projectRole.delete({ where: { id } });
        return true;
    }

    async setUserRole(projectId: number, userId: number, roleId: number) {
        return this.prisma.projectUser.update({
            where: { projectId_userId: { projectId, userId } },
            data: { projectRoleId: roleId },
            include: {
                user: { select: { id: true, firstName: true, lastName: true, email: true } },
                projectRole: true,
                department: true,
            },
        });
    }

    async unsetUserRole(projectId: number, userId: number) {
        return this.prisma.projectUser.update({
            where: { projectId_userId: { projectId, userId } },
            data: { projectRoleId: null },
            include: {
                user: { select: { id: true, firstName: true, lastName: true, email: true } },
                projectRole: true,
                department: true,
            },
        });
    }

    // ─── DEPARTMENTS ─────────────────────────────────────────────

    async getDepartments(projectId: number) {
        return this.prisma.department.findMany({ where: { projectId } });
    }

    async createDepartment(projectId: number, name: string) {
        await this.findOne(projectId);
        return this.prisma.department.create({ data: { projectId, name } });
    }

    async updateDepartment(id: number, name: string) {
        await this.prisma.department.findUniqueOrThrow({ where: { id } });
        return this.prisma.department.update({ where: { id }, data: { name } });
    }

    async removeDepartment(id: number) {
        await this.prisma.department.findUniqueOrThrow({ where: { id } });
        await this.prisma.department.delete({ where: { id } });
        return true;
    }

    async assignUserToDepartment(projectId: number, userId: number, departmentId: number) {
        return this.prisma.projectUser.update({
            where: { projectId_userId: { projectId, userId } },
            data: { departmentId },
            include: {
                user: { select: { id: true, firstName: true, lastName: true, email: true } },
                projectRole: true,
                department: true,
            },
        });
    }

    async removeUserFromDepartment(projectId: number, userId: number) {
        return this.prisma.projectUser.update({
            where: { projectId_userId: { projectId, userId } },
            data: { departmentId: null },
            include: {
                user: { select: { id: true, firstName: true, lastName: true, email: true } },
                projectRole: true,
                department: true,
            },
        });
    }

    // ─── PERMISSIONS ─────────────────────────────────────────────

    async getPermissions(roleId: number) {
        return this.prisma.permission.findMany({ where: { projectRoleId: roleId } });
    }

    async setPermission(
        roleId: number,
        resource: string,
        departmentId: number | null,
        canView: boolean,
        canCreate: boolean,
        canEdit: boolean,
        canDelete: boolean,
    ) {
        return this.prisma.permission.upsert({
            where: {
                projectRoleId_departmentId_resource: {
                    projectRoleId: roleId,
                    departmentId: departmentId as number,
                    resource,
                },
            },
            update: { canView, canCreate, canEdit, canDelete },
            create: { projectRoleId: roleId, departmentId, resource, canView, canCreate, canEdit, canDelete },
        });
    }

    async removePermission(id: number) {
        await this.prisma.permission.findUniqueOrThrow({ where: { id } });
        await this.prisma.permission.delete({ where: { id } });
        return true;
    }

    // ─── TASKS ───────────────────────────────────────────────────

    async getTasks(projectId: number, departmentId?: number) {
        return this.prisma.task.findMany({
            where: { projectId, ...(departmentId ? { departmentId } : {}) },
            include: {
                assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
                department: true,
                subtasks: {
                    include: {
                        assignee: { select: { id: true, firstName: true, lastName: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async createTask(projectId: number, data: {
        title: string;
        description?: string;
        departmentId?: number;
        assignedTo?: number;
        type?: string;
        formSchema?: string;
    }) {
        return this.prisma.task.create({
            data: { projectId, ...data },
            include: {
                assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
                department: true,
                subtasks: true,
            },
        });
    }

    async updateTask(id: number, data: {
        title?: string;
        description?: string;
        status?: string;
        assignedTo?: number;
        submissionData?: string;
    }) {
        await this.prisma.task.findUniqueOrThrow({ where: { id } });
        return this.prisma.task.update({
            where: { id },
            data,
            include: {
                assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
                department: true,
                subtasks: true,
            },
        });
    }

    async removeTask(id: number) {
        await this.prisma.task.findUniqueOrThrow({ where: { id } });
        await this.prisma.task.delete({ where: { id } });
        return true;
    }

    async createSubTask(taskId: number, data: {
        title: string;
        description?: string;
        assignedTo?: number;
        type?: string;
        formSchema?: string;
    }) {
        return this.prisma.subTask.create({
            data: { taskId, ...data },
            include: {
                assignee: { select: { id: true, firstName: true, lastName: true } },
            },
        });
    }

    async updateSubTask(id: number, data: {
        title?: string;
        description?: string;
        status?: string;
        assignedTo?: number;
        submissionData?: string;
    }) {
        await this.prisma.subTask.findUniqueOrThrow({ where: { id } });
        return this.prisma.subTask.update({
            where: { id },
            data,
            include: {
                assignee: { select: { id: true, firstName: true, lastName: true } },
            },
        });
    }

    async removeSubTask(id: number) {
        await this.prisma.subTask.findUniqueOrThrow({ where: { id } });
        await this.prisma.subTask.delete({ where: { id } });
        return true;
    }

    // ─── USER-FACING: check user access in a project ─────────────

    async getUserPermission(userId: number, projectId: number, resource: string, departmentId?: number) {
        const projectUser = await this.prisma.projectUser.findUnique({
            where: { projectId_userId: { projectId, userId } },
            include: {
                projectRole: {
                    include: {
                        permissions: {
                            where: {
                                resource,
                                ...(departmentId ? { departmentId } : {}),
                            },
                        },
                    },
                },
            },
        });

        if (!projectUser?.projectRole) return null;
        return projectUser.projectRole.permissions[0] ?? null;
    }
}