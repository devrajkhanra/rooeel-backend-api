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

    private readonly defaultUserViewResources = ['WORK_ORDER', 'TASK', 'SUBTASK', 'DEPARTMENT', 'USER'];

    private normalizeResource(resource?: string | null) {
        return (resource || '').trim().toUpperCase();
    }

    private createEmptyAccess() {
        return {
            canView: false,
            canCreate: false,
            canEdit: false,
            canDelete: false,
        };
    }

    private setAccess(
        accessMap: Record<string, { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }>,
        resource: string,
        flags: { canView?: boolean; canCreate?: boolean; canEdit?: boolean; canDelete?: boolean },
    ) {
        const key = this.normalizeResource(resource);
        if (!key) return;
        accessMap[key] = {
            canView: !!flags.canView,
            canCreate: !!flags.canCreate,
            canEdit: !!flags.canEdit,
            canDelete: !!flags.canDelete,
        };
    }

    private mergeAccess(
        accessMap: Record<string, { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }>,
        resource: string,
        flags: { canView?: boolean; canCreate?: boolean; canEdit?: boolean; canDelete?: boolean },
    ) {
        const key = this.normalizeResource(resource);
        if (!key) return;
        if (!accessMap[key]) accessMap[key] = this.createEmptyAccess();
        accessMap[key].canView = accessMap[key].canView || !!flags.canView;
        accessMap[key].canCreate = accessMap[key].canCreate || !!flags.canCreate;
        accessMap[key].canEdit = accessMap[key].canEdit || !!flags.canEdit;
        accessMap[key].canDelete = accessMap[key].canDelete || !!flags.canDelete;
    }

    private canAccess(
        accessMap: Record<string, { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }>,
        resource: string,
        action: 'canView' | 'canCreate' | 'canEdit' | 'canDelete' = 'canView',
    ) {
        const key = this.normalizeResource(resource);
        return !!accessMap[key]?.[action];
    }

    private async getAccessMapForProjectUser(projectUser: {
        projectRoleId: number | null;
        departmentRoleId: number | null;
        departmentId: number | null;
    }) {
        const accessMap: Record<string, { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }> = {};

        const projectRolePermissions = projectUser.projectRoleId
            ? await this.prisma.permission.findMany({
                where: {
                    projectRoleId: projectUser.projectRoleId,
                    OR: [
                        { departmentId: null },
                        ...(projectUser.departmentId ? [{ departmentId: projectUser.departmentId }] : []),
                    ],
                },
            })
            : [];

        const departmentRolePolicies = projectUser.departmentRoleId
            ? await this.prisma.departmentRolePolicy.findMany({
                where: { departmentRoleId: projectUser.departmentRoleId },
            })
            : [];

        if (departmentRolePolicies.length > 0) {
            // Department-role policy is authoritative for resources it defines.
            departmentRolePolicies.forEach((policy) => {
                this.setAccess(accessMap, policy.resource, {
                    canView: policy.canView,
                    canCreate: policy.canCreate,
                    canEdit: policy.canEdit,
                    canDelete: policy.canDelete,
                });
            });

            // Fall back to project-role permissions only for resources not set on department role.
            projectRolePermissions.forEach((permission) => {
                const key = this.normalizeResource(permission.resource);
                if (!accessMap[key]) {
                    this.setAccess(accessMap, permission.resource, {
                        canView: permission.canView,
                        canCreate: permission.canCreate,
                        canEdit: permission.canEdit,
                        canDelete: permission.canDelete,
                    });
                }
            });
        } else {
            projectRolePermissions.forEach((permission) => {
                this.mergeAccess(accessMap, permission.resource, {
                    canView: permission.canView,
                    canCreate: permission.canCreate,
                    canEdit: permission.canEdit,
                    canDelete: permission.canDelete,
                });
            });
        }

        const hasAnyPolicy = projectRolePermissions.length > 0 || departmentRolePolicies.length > 0;
        if (!hasAnyPolicy) {
            this.defaultUserViewResources.forEach((resource) => {
                this.mergeAccess(accessMap, resource, { canView: true });
            });
        }

        return accessMap;
    }

    private async applyViewerPolicyOnProject(project: any, viewerUserId: number) {
        const membership = (project.users || []).find((user: any) => Number(user.userId) === Number(viewerUserId));
        if (!membership) {
            return {
                ...project,
                users: [],
                departments: [],
                tasks: [],
                workOrders: [],
            };
        }

        const accessMap = await this.getAccessMapForProjectUser({
            projectRoleId: membership.projectRoleId ?? null,
            departmentRoleId: membership.departmentRoleId ?? null,
            departmentId: membership.departmentId ?? null,
        });

        const canViewUsers = this.canAccess(accessMap, 'USER', 'canView');
        const canViewDepartments = this.canAccess(accessMap, 'DEPARTMENT', 'canView');
        const canViewTasks = this.canAccess(accessMap, 'TASK', 'canView');
        const canViewWorkOrders = this.canAccess(accessMap, 'WORK_ORDER', 'canView');

        return {
            ...project,
            users: canViewUsers ? project.users : (project.users || []).filter((user: any) => Number(user.userId) === Number(viewerUserId)),
            departments: canViewDepartments ? project.departments : [],
            tasks: canViewTasks ? project.tasks : [],
            workOrders: canViewWorkOrders ? project.workOrders : [],
        };
    }

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
                admin: { select: { id: true, firstName: true, lastName: true } },
                users: { select: { id: true } },
                tasks: { select: { id: true } },
                workOrders: { select: { id: true } },
            },
        });
    }

    async getUserProjects(userId: number) {
        const memberships = await this.prisma.projectUser.findMany({
            where: { userId },
            include: {
                project: {
                    include: {
                        admin: { select: { id: true, firstName: true, lastName: true } },
                        users: {
                            include: {
                                user: { select: { id: true, firstName: true, lastName: true, email: true } },
                                projectRole: true,
                                department: true,
                                departmentRole: true,
                            },
                        },
                        workOrders: { orderBy: { createdAt: 'desc' } },
                        tasks: true,
                    },
                },
            },
        });

        const projects = await Promise.all(
            memberships.map(async (membership) => {
                const filteredProject = await this.applyViewerPolicyOnProject(membership.project, userId);
                const workOrdersWithUrls = await Promise.all(
                    (filteredProject.workOrders || []).map(async (workOrder: any) => ({
                        ...workOrder,
                        fileUrl: await this.storage.getPresignedUrl(workOrder.fileKey, workOrder.fileName),
                    })),
                );
                return { ...filteredProject, workOrders: workOrdersWithUrls };
            }),
        );

        return projects;
    }

    async findOne(id: number, viewer?: { userId: number; role?: string }) {
        let project = await this.prisma.project.findUnique({
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
                        departmentRole: true,
                    },
                },
            },
        });
        if (!project) throw new NotFoundException(`Project with ID ${id} not found`);

        if (viewer && viewer.role !== 'admin') {
            const assigned = (project.users || []).some((user) => Number(user.userId) === Number(viewer.userId));
            if (!assigned) {
                throw new NotFoundException(`Project with ID ${id} not found`);
            }
            project = await this.applyViewerPolicyOnProject(project, viewer.userId);
        }

        const safeProject: any = project;
        const workOrdersWithUrls = await Promise.all(
            (safeProject.workOrders || []).map(async (wo: any) => ({
                ...wo,
                fileUrl: await this.storage.getPresignedUrl(wo.fileKey, wo.fileName),
            })),
        );
        return { ...safeProject, workOrders: workOrdersWithUrls };
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
                departmentRole: true,
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
                departmentRole: true,
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
        return Promise.all(workOrders.map(async (wo) => ({
            ...wo,
            fileUrl: await this.storage.getPresignedUrl(wo.fileKey, wo.fileName),
        })));
    }

    async uploadWorkOrder(projectId: number, adminId: number, file: Express.Multer.File, name?: string) {
        await this.findOne(projectId);
        const fileKey = await this.storage.uploadFile(file, 'work-orders');
        const baseName = (name || file.originalname.replace(/\.pdf$/i, '')).trim();
        const safeName = baseName.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim() || 'Work Order';
        const datePart = new Date().toISOString().split('T')[0];
        const displayName = `${safeName} - ${datePart}.pdf`;
        const workOrder = await this.prisma.workOrderPdf.create({
            data: { projectId, fileKey, fileName: displayName, uploadedBy: adminId },
        });
        return { ...workOrder, fileUrl: await this.storage.getPresignedUrl(fileKey, workOrder.fileName) };
    }

    async deleteWorkOrder(workOrderId: number) {
        const wo = await this.prisma.workOrderPdf.findUniqueOrThrow({ where: { id: workOrderId } });
        await this.storage.deleteFile(wo.fileKey);
        await this.prisma.workOrderPdf.delete({ where: { id: workOrderId } });
        return true;
    }

    async getWorkOrderForViewing(projectId: number, workOrderId: number) {
        const workOrder = await this.prisma.workOrderPdf.findFirst({
            where: { id: workOrderId, projectId },
        });
        if (!workOrder) {
            throw new NotFoundException(`Work order with ID ${workOrderId} not found in project ${projectId}`);
        }
        const stream = await this.storage.getFileStream(workOrder.fileKey);
        return {
            stream,
            fileName: workOrder.fileName,
        };
    }

    // ─── ROLES ───────────────────────────────────────────────────

    async getRoles(projectId: number) {
        return this.prisma.projectRole.findMany({ where: { projectId } });
    }

    async createRole(projectId: number, name: string) {
        await this.findOne(projectId);
        const normalizedName = name.trim();
        if (!normalizedName) {
            throw new ConflictException('Role name is required');
        }

        const existing = await this.prisma.projectRole.findFirst({
            where: { projectId, name: normalizedName },
            select: { id: true },
        });
        if (existing) {
            throw new ConflictException(`Role "${normalizedName}" already exists in this project`);
        }

        return this.prisma.projectRole.create({ data: { projectId, name: normalizedName } });
    }

    async updateRole(id: number, name: string) {
        const role = await this.prisma.projectRole.findUniqueOrThrow({
            where: { id },
            select: { id: true, projectId: true, name: true },
        });

        const normalizedName = name.trim();
        if (!normalizedName) {
            throw new ConflictException('Role name is required');
        }

        const duplicate = await this.prisma.projectRole.findFirst({
            where: {
                projectId: role.projectId,
                name: normalizedName,
                id: { not: id },
            },
            select: { id: true },
        });
        if (duplicate) {
            throw new ConflictException(`Role "${normalizedName}" already exists in this project`);
        }

        return this.prisma.projectRole.update({
            where: { id },
            data: { name: normalizedName },
        });
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
                departmentRole: true,
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
                departmentRole: true,
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

    async getDepartmentRoles(departmentId: number) {
        await this.prisma.department.findUniqueOrThrow({ where: { id: departmentId } });
        return this.prisma.departmentRole.findMany({
            where: { departmentId },
            orderBy: { name: 'asc' },
        });
    }

    async createDepartmentRole(departmentId: number, name: string) {
        await this.prisma.department.findUniqueOrThrow({ where: { id: departmentId } });
        const normalizedName = name.trim();
        if (!normalizedName) throw new ConflictException('Role name is required');
        return this.prisma.departmentRole.create({
            data: { departmentId, name: normalizedName },
        });
    }

    async updateDepartmentRole(id: number, name: string) {
        const role = await this.prisma.departmentRole.findUniqueOrThrow({
            where: { id },
            select: { id: true, departmentId: true },
        });
        const normalizedName = name.trim();
        if (!normalizedName) throw new ConflictException('Role name is required');
        const duplicate = await this.prisma.departmentRole.findFirst({
            where: {
                departmentId: role.departmentId,
                name: normalizedName,
                id: { not: id },
            },
            select: { id: true },
        });
        if (duplicate) throw new ConflictException(`Role "${normalizedName}" already exists in this department`);
        return this.prisma.departmentRole.update({
            where: { id },
            data: { name: normalizedName },
        });
    }

    async removeDepartmentRole(id: number) {
        await this.prisma.departmentRole.findUniqueOrThrow({ where: { id } });
        await this.prisma.departmentRole.delete({ where: { id } });
        return true;
    }

    async getDepartmentRolePolicies(roleId: number) {
        await this.prisma.departmentRole.findUniqueOrThrow({ where: { id: roleId } });
        return this.prisma.departmentRolePolicy.findMany({
            where: { departmentRoleId: roleId },
            orderBy: { resource: 'asc' },
        });
    }

    async setDepartmentRolePolicy(
        roleId: number,
        resource: string,
        canView: boolean,
        canCreate: boolean,
        canEdit: boolean,
        canDelete: boolean,
    ) {
        await this.prisma.departmentRole.findUniqueOrThrow({ where: { id: roleId } });
        const normalizedResource = resource.trim().toUpperCase();
        if (!normalizedResource) throw new ConflictException('Resource is required');

        return this.prisma.departmentRolePolicy.upsert({
            where: {
                departmentRoleId_resource: {
                    departmentRoleId: roleId,
                    resource: normalizedResource,
                },
            },
            update: { canView, canCreate, canEdit, canDelete },
            create: {
                departmentRoleId: roleId,
                resource: normalizedResource,
                canView,
                canCreate,
                canEdit,
                canDelete,
            },
        });
    }

    async removeDepartmentRolePolicy(id: number) {
        await this.prisma.departmentRolePolicy.findUniqueOrThrow({ where: { id } });
        await this.prisma.departmentRolePolicy.delete({ where: { id } });
        return true;
    }

    async assignUserToDepartment(projectId: number, userId: number, departmentId: number) {
        const department = await this.prisma.department.findUniqueOrThrow({
            where: { id: departmentId },
            select: { id: true, projectId: true },
        });
        if (department.projectId !== projectId) {
            throw new ConflictException('Department does not belong to this project');
        }

        return this.prisma.projectUser.update({
            where: { projectId_userId: { projectId, userId } },
            data: { departmentId, departmentRoleId: null },
            include: {
                user: { select: { id: true, firstName: true, lastName: true, email: true } },
                projectRole: true,
                department: true,
                departmentRole: true,
            },
        });
    }

    async removeUserFromDepartment(projectId: number, userId: number) {
        return this.prisma.projectUser.update({
            where: { projectId_userId: { projectId, userId } },
            data: { departmentId: null, departmentRoleId: null },
            include: {
                user: { select: { id: true, firstName: true, lastName: true, email: true } },
                projectRole: true,
                department: true,
                departmentRole: true,
            },
        });
    }

    async setUserDepartmentRole(projectId: number, userId: number, departmentRoleId: number) {
        await this.prisma.projectUser.findUniqueOrThrow({
            where: { projectId_userId: { projectId, userId } },
            select: { id: true },
        });

        const role = await this.prisma.departmentRole.findUniqueOrThrow({
            where: { id: departmentRoleId },
            select: {
                id: true,
                departmentId: true,
                department: { select: { projectId: true } },
            },
        });
        if (role.department.projectId !== projectId) {
            throw new ConflictException('Department role does not belong to this project');
        }

        return this.prisma.projectUser.update({
            where: { projectId_userId: { projectId, userId } },
            data: {
                departmentId: role.departmentId,
                departmentRoleId: role.id,
            },
            include: {
                user: { select: { id: true, firstName: true, lastName: true, email: true } },
                projectRole: true,
                department: true,
                departmentRole: true,
            },
        });
    }

    async unsetUserDepartmentRole(projectId: number, userId: number) {
        return this.prisma.projectUser.update({
            where: { projectId_userId: { projectId, userId } },
            data: { departmentRoleId: null },
            include: {
                user: { select: { id: true, firstName: true, lastName: true, email: true } },
                projectRole: true,
                department: true,
                departmentRole: true,
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
        // Prisma upsert cannot target a nullable member inside a composite unique
        // when that member is null, so we do a find+update/create for global permissions.
        if (departmentId === null) {
            const existing = await this.prisma.permission.findFirst({
                where: { projectRoleId: roleId, resource, departmentId: null },
            });

            if (existing) {
                return this.prisma.permission.update({
                    where: { id: existing.id },
                    data: { canView, canCreate, canEdit, canDelete },
                });
            }

            return this.prisma.permission.create({
                data: {
                    projectRoleId: roleId,
                    departmentId: null,
                    resource,
                    canView,
                    canCreate,
                    canEdit,
                    canDelete,
                },
            });
        }

        return this.prisma.permission.upsert({
            where: {
                projectRoleId_departmentId_resource: {
                    projectRoleId: roleId,
                    departmentId,
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

    async getTasks(projectId: number, departmentId?: number, viewer?: { userId: number; role?: string }) {
        let scopedWhere: any = { projectId };

        if (viewer && viewer.role !== 'admin') {
            const projectUser = await this.prisma.projectUser.findUnique({
                where: { projectId_userId: { projectId, userId: viewer.userId } },
                select: {
                    userId: true,
                    departmentId: true,
                    projectRoleId: true,
                    departmentRoleId: true,
                },
            });

            if (!projectUser) {
                return [];
            }

            const accessMap = await this.getAccessMapForProjectUser({
                projectRoleId: projectUser.projectRoleId,
                departmentRoleId: projectUser.departmentRoleId,
                departmentId: projectUser.departmentId,
            });

            if (!this.canAccess(accessMap, 'TASK', 'canView')) {
                return [];
            }

            if (departmentId && projectUser.departmentId && departmentId !== projectUser.departmentId) {
                return [];
            }

            if (!departmentId && projectUser.departmentId) {
                scopedWhere = {
                    ...scopedWhere,
                    OR: [
                        { departmentId: projectUser.departmentId },
                        { assignedTo: viewer.userId },
                    ],
                };
            }
        }

        return this.prisma.task.findMany({
            where: {
                ...scopedWhere,
                ...(departmentId ? { departmentId } : {}),
            },
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
            select: { projectRoleId: true },
        });

        if (!projectUser?.projectRoleId) return null;

        if (departmentId) {
            const scopedPermission = await this.prisma.permission.findFirst({
                where: { projectRoleId: projectUser.projectRoleId, resource, departmentId },
            });
            if (scopedPermission) return scopedPermission;
        }

        return this.prisma.permission.findFirst({
            where: { projectRoleId: projectUser.projectRoleId, resource, departmentId: null },
        });
    }
}
