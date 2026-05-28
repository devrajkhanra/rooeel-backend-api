import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
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
    private readonly projectFieldResources = ['FIELD', 'PROJECT_FIELD'];
    private readonly hardcodedTaskResources = [
        'DRAWING_VIEW_FOLDERS',
        'DRAWING_VIEW_REGISTERS',
        'DRAWING_CREATE_FOLDER',
        'DRAWING_RENAME_FOLDER',
        'DRAWING_DELETE_FOLDER',
        'DRAWING_VIEW_PDFS',
        'DRAWING_UPLOAD_PDF',
        'DRAWING_UPLOAD_MULTIPLE_PDFS',
        'DRAWING_RENAME_PDF',
        'DRAWING_DELETE_PDF',
        'DRAWING_DELETE_MULTIPLE_PDFS',
        'DRAWING_CREATE_REGISTER',
        'DRAWING_DELETE_REGISTER',
        'BILL_OF_MATERIAL_FOLDER_VIEW',
        'BILL_OF_MATERIAL_FOLDER_CREATE',
        'BILL_OF_MATERIAL_FOLDER_RENAME',
        'BILL_OF_MATERIAL_FOLDER_DELETE',
        'BILL_OF_MATERIAL_TRACK_CREATE',
        'BILL_OF_MATERIAL_TRACK_VIEW',
        'BILL_OF_MATERIAL_TRACK_RENAME',
        'BILL_OF_MATERIAL_TRACK_EDIT',
        'MIV_MIN_FOLDER_VIEW',
        'MIV_MIN_FOLDER_CREATE',
        'MIV_MIN_FOLDER_RENAME',
        'MIV_MIN_FOLDER_DELETE',
        'MIN_MIV_PDF_VIEW',
        'MIN_MIV_PDF_UPLOAD',
        'MIN_MIV_PDF_RENAME',
        'MIN_MIV_PDF_DELETE',
        'MIV_MIN_REGISTER_CREATE',
        'MIV_MIN_REGISTER_VIEW',
        'MIV_MIN_REGISTER_RENAME',
        'MIV_MIN_REGISTER_DELETE',
        'CHALLAN_FOLDER_VIEW',
        'CHALLAN_FOLDER_CREATE',
        'CHALLAN_FOLDER_RENAME',
        'CHALLAN_FOLDER_DELETE',
        'CHALLAN_PDF_VIEW',
        'CHALLAN_PDF_UPLOAD',
        'CHALLAN_PDF_RENAME',
        'CHALLAN_PDF_DELETE',
        'CHALLAN_REGISTER_CREATE',
        'CHALLAN_REGISTER_VIEW',
        'CHALLAN_REGISTER_RENAME',
        'CHALLAN_REGISTER_DELETE',
        'CHALLAN_REGISTER_EDIT',
        'SCHEDULE_FOLDER_CREATE',
        'SCHEDULE_FOLDER_RENAME',
        'SCHEDULE_FOLDER_VIEW',
        'SCHEDULE_FOLDER_DELETE',
        'L3_SCHEDULE_VIEW',
        'L3_SCHEDULE_CREATE',
        'L3_SCHEDULE_EDIT',
        'L3_SCHEDULE_RENAME',
        'L3_SCHEDULE_DELETE',
        'LHS_FOLDER_CREATE',
        'LHS_FOLDER_VIEW',
        'LHS_FOLDER_EDIT',
        'LHS_FOLDER_DELETE',
    ];
    private readonly hardcodedViewOnlyResources = [
        'DRAWING_VIEW_FOLDERS',
        'DRAWING_VIEW_REGISTERS',
        'DRAWING_VIEW_PDFS',
        'BILL_OF_MATERIAL_FOLDER_VIEW',
        'BILL_OF_MATERIAL_TRACK_VIEW',
        'MIV_MIN_FOLDER_VIEW',
        'MIN_MIV_PDF_VIEW',
        'MIV_MIN_REGISTER_VIEW',
        'CHALLAN_FOLDER_VIEW',
        'CHALLAN_PDF_VIEW',
        'CHALLAN_REGISTER_VIEW',
        'SCHEDULE_FOLDER_VIEW',
        'L3_SCHEDULE_VIEW',
        'LHS_FOLDER_VIEW',
    ];
    private readonly allowedPolicyResources = [
        ...this.defaultUserViewResources,
        ...this.projectFieldResources,
        ...this.hardcodedTaskResources,
    ];

    private hasPolicyForAnyResource(
        accessMap: Record<string, { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }>,
        resources: string[],
    ) {
        return resources.some((resource) => {
            const key = this.normalizeResource(resource);
            return !!accessMap[key];
        });
    }

    private hasAccessForAnyResource(
        accessMap: Record<string, { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }>,
        resources: string[],
        action: 'canView' | 'canCreate' | 'canEdit' | 'canDelete' = 'canView',
    ) {
        return resources.some((resource) => this.canAccess(accessMap, resource, action));
    }

    private buildEffectiveAccessPolicies(
        accessMap: Record<string, { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }>,
    ) {
        return Object.entries(accessMap)
            .map(([resource, flags]) => ({
                resource,
                canView: !!flags.canView,
                canCreate: !!flags.canCreate,
                canEdit: !!flags.canEdit,
                canDelete: !!flags.canDelete,
            }))
            .sort((a, b) => a.resource.localeCompare(b.resource));
    }

    private normalizeResource(resource?: string | null) {
        return (resource || '').trim().toUpperCase();
    }

    private normalizePolicyResource(resource?: string | null) {
        const normalized = this.normalizeResource(resource);
        const aliases: Record<string, string> = {
            DRAWING_UPLOAD_MULTIPLE_PDF: 'DRAWING_UPLOAD_MULTIPLE_PDFS',
            DRAWING_DELETE_MULTIPLE_PDF: 'DRAWING_DELETE_MULTIPLE_PDFS',
            UPLOAD_MULTIPLE_PDFS: 'DRAWING_UPLOAD_MULTIPLE_PDFS',
            DELETE_MULTIPLE_PDFS: 'DRAWING_DELETE_MULTIPLE_PDFS',
            DRAWING_VIEW_FOLDER: 'DRAWING_VIEW_FOLDERS',
            VIEW_FOLDERS: 'DRAWING_VIEW_FOLDERS',
            DRAWING_VIEW_REGISTER: 'DRAWING_VIEW_REGISTERS',
            VIEW_REGISTER: 'DRAWING_VIEW_REGISTERS',
            VIEW_REGISTERS: 'DRAWING_VIEW_REGISTERS',
            DRAWING_VIEW_PDF: 'DRAWING_VIEW_PDFS',
            VIEW_PDFS: 'DRAWING_VIEW_PDFS',
            BILL_OF_MATERIAL_VIEW_TRACK_REGISTER: 'BILL_OF_MATERIAL_TRACK_VIEW',
            VIEW_BILL_OF_MATERIAL_TRACK_REGISTER: 'BILL_OF_MATERIAL_TRACK_VIEW',
            BOM_TRACK_VIEW: 'BILL_OF_MATERIAL_TRACK_VIEW',
            BILL_OF_MATERIAL_EDIT_TRACK_REGISTER: 'BILL_OF_MATERIAL_TRACK_EDIT',
            EDIT_BILL_OF_MATERIAL_TRACK_REGISTER: 'BILL_OF_MATERIAL_TRACK_EDIT',
            BOM_TRACK_EDIT: 'BILL_OF_MATERIAL_TRACK_EDIT',
            BILL_OF_MATERIAL_CREATE_FOLDER: 'BILL_OF_MATERIAL_FOLDER_CREATE',
            BILL_OF_MATERIAL_VIEW_FOLDER: 'BILL_OF_MATERIAL_FOLDER_VIEW',
            BILL_OF_MATERIAL_RENAME_FOLDER: 'BILL_OF_MATERIAL_FOLDER_RENAME',
            BILL_OF_MATERIAL_DELETE_FOLDER: 'BILL_OF_MATERIAL_FOLDER_DELETE',
            CREATE_BILL_OF_MATERIALS_FOLDERS: 'BILL_OF_MATERIAL_FOLDER_CREATE',
            VIEW_BILL_OF_MATERIALS_FOLDERS: 'BILL_OF_MATERIAL_FOLDER_VIEW',
            RENAME_BILL_OF_MATERIALS_FOLDERS: 'BILL_OF_MATERIAL_FOLDER_RENAME',
            DELETE_BILL_OF_MATERIALS_FOLDERS: 'BILL_OF_MATERIAL_FOLDER_DELETE',
            BILL_OF_MATERIAL_TRACK_CREATE_REGISTER: 'BILL_OF_MATERIAL_TRACK_CREATE',
            BILL_OF_MATERIAL_TRACK_RENAME_REGISTER: 'BILL_OF_MATERIAL_TRACK_RENAME',
            CREATE_BILL_OF_MATERIALS_TRACK_REGISTER: 'BILL_OF_MATERIAL_TRACK_CREATE',
            RENAME_BILL_OF_MATERIALS_TRACK_REGISTER: 'BILL_OF_MATERIAL_TRACK_RENAME',
            MIV_MIN_CREATE_FOLDER: 'MIV_MIN_FOLDER_CREATE',
            MIV_MIN_VIEW_FOLDER: 'MIV_MIN_FOLDER_VIEW',
            MIV_MIN_RENAME_FOLDER: 'MIV_MIN_FOLDER_RENAME',
            MIV_MIN_DELETE_FOLDER: 'MIV_MIN_FOLDER_DELETE',
            CREATE_MIV_MIN_FOLDERS: 'MIV_MIN_FOLDER_CREATE',
            VIEW_MIV_MIN_FOLDERS: 'MIV_MIN_FOLDER_VIEW',
            RENAME_MIV_MIN_FOLDERS: 'MIV_MIN_FOLDER_RENAME',
            DELETE_MIV_MIN_FOLDERS: 'MIV_MIN_FOLDER_DELETE',
            MIN_MIV_VIEW_PDF: 'MIN_MIV_PDF_VIEW',
            MIN_MIV_UPLOAD_PDF: 'MIN_MIV_PDF_UPLOAD',
            MIN_MIV_RENAME_PDF: 'MIN_MIV_PDF_RENAME',
            MIN_MIV_DELETE_PDF: 'MIN_MIV_PDF_DELETE',
            VIEW_MIN_MIV_PDF: 'MIN_MIV_PDF_VIEW',
            UPLOAD_MIN_MIV_PDF: 'MIN_MIV_PDF_UPLOAD',
            RENAME_MIN_MIV_PDF: 'MIN_MIV_PDF_RENAME',
            DELETE_MIN_MIV_PDF: 'MIN_MIV_PDF_DELETE',
            MIV_MIN_CREATE_REGISTER: 'MIV_MIN_REGISTER_CREATE',
            MIV_MIN_VIEW_REGISTER: 'MIV_MIN_REGISTER_VIEW',
            MIV_MIN_RENAME_REGISTER: 'MIV_MIN_REGISTER_RENAME',
            MIV_MIN_DELETE_REGISTER: 'MIV_MIN_REGISTER_DELETE',
            CREATE_MIV_MIN_REGISTER: 'MIV_MIN_REGISTER_CREATE',
            VIEW_MIV_MIN_REGISTER: 'MIV_MIN_REGISTER_VIEW',
            RENAME_MIV_MIN_REGISTER: 'MIV_MIN_REGISTER_RENAME',
            DELETE_MIV_MIN_REGISTER: 'MIV_MIN_REGISTER_DELETE',
            CHALLAN_CREATE_FOLDER: 'CHALLAN_FOLDER_CREATE',
            CHALLAN_VIEW_FOLDER: 'CHALLAN_FOLDER_VIEW',
            CHALLAN_RENAME_FOLDER: 'CHALLAN_FOLDER_RENAME',
            CHALLAN_DELETE_FOLDER: 'CHALLAN_FOLDER_DELETE',
            CREATE_CHALLAN_FOLDERS: 'CHALLAN_FOLDER_CREATE',
            VIEW_CHALLAN_FOLDERS: 'CHALLAN_FOLDER_VIEW',
            RENAME_CHALLAN_FOLDERS: 'CHALLAN_FOLDER_RENAME',
            DELETE_CHALLAN_FOLDERS: 'CHALLAN_FOLDER_DELETE',
            CHALLAN_VIEW_PDF: 'CHALLAN_PDF_VIEW',
            CHALLAN_UPLOAD_PDF: 'CHALLAN_PDF_UPLOAD',
            CHALLAN_RENAME_PDF: 'CHALLAN_PDF_RENAME',
            CHALLAN_DELETE_PDF: 'CHALLAN_PDF_DELETE',
            VIEW_CHALLAN_PDF: 'CHALLAN_PDF_VIEW',
            UPLOAD_CHALLAN_PDF: 'CHALLAN_PDF_UPLOAD',
            RENAME_CHALLAN_PDF: 'CHALLAN_PDF_RENAME',
            DELETE_CHALLAN_PDF: 'CHALLAN_PDF_DELETE',
            CHALLAN_CREATE_REGISTER: 'CHALLAN_REGISTER_CREATE',
            CHALLAN_VIEW_REGISTER: 'CHALLAN_REGISTER_VIEW',
            CHALLAN_RENAME_REGISTER: 'CHALLAN_REGISTER_RENAME',
            CHALLAN_DELETE_REGISTER: 'CHALLAN_REGISTER_DELETE',
            CHALLAN_EDIT_REGISTER: 'CHALLAN_REGISTER_EDIT',
            CREATE_CHALLAN_REGISTER: 'CHALLAN_REGISTER_CREATE',
            VIEW_CHALLAN_REGISTER: 'CHALLAN_REGISTER_VIEW',
            RENAME_CHALLAN_REGISTER: 'CHALLAN_REGISTER_RENAME',
            DELETE_CHALLAN_REGISTER: 'CHALLAN_REGISTER_DELETE',
            EDIT_CHALLAN_REGISTER: 'CHALLAN_REGISTER_EDIT',
            SCHEDULE_CREATE_FOLDER: 'SCHEDULE_FOLDER_CREATE',
            SCHEDULE_RENAME_FOLDER: 'SCHEDULE_FOLDER_RENAME',
            SCHEDULE_VIEW_FOLDER: 'SCHEDULE_FOLDER_VIEW',
            SCHEDULE_DELETE_FOLDER: 'SCHEDULE_FOLDER_DELETE',
            CREATE_SCHEDULE_FOLDERS: 'SCHEDULE_FOLDER_CREATE',
            RENAME_SCHEDULE_FOLDERS: 'SCHEDULE_FOLDER_RENAME',
            VIEW_SCHEDULE_FOLDERS: 'SCHEDULE_FOLDER_VIEW',
            DELETE_SCHEDULE_FOLDERS: 'SCHEDULE_FOLDER_DELETE',
            VIEW_L3_SCHEDULE: 'L3_SCHEDULE_VIEW',
            CREATE_L3_SCHEDULE: 'L3_SCHEDULE_CREATE',
            EDIT_L3_SCHEDULE: 'L3_SCHEDULE_EDIT',
            RENAME_L3_SCHEDULE: 'L3_SCHEDULE_RENAME',
            DELETE_L3_SCHEDULE: 'L3_SCHEDULE_DELETE',
            L3_CREATE_SCHEDULE: 'L3_SCHEDULE_CREATE',
            L3_EDIT_SCHEDULE: 'L3_SCHEDULE_EDIT',
            L3_RENAME_SCHEDULE: 'L3_SCHEDULE_RENAME',
            L3_DELETE_SCHEDULE: 'L3_SCHEDULE_DELETE',
            L3_VIEW_SCHEDULE: 'L3_SCHEDULE_VIEW',
            LINE_HISTORY_SHEET_CREATE_FOLDER: 'LHS_FOLDER_CREATE',
            LINE_HISTORY_SHEET_VIEW_FOLDER: 'LHS_FOLDER_VIEW',
            LINE_HISTORY_SHEET_EDIT_FOLDER: 'LHS_FOLDER_EDIT',
            LINE_HISTORY_SHEET_DELETE_FOLDER: 'LHS_FOLDER_DELETE',
            CREATE_LINE_HISTORY_SHEET_FOLDERS: 'LHS_FOLDER_CREATE',
            VIEW_LINE_HISTORY_SHEET_FOLDERS: 'LHS_FOLDER_VIEW',
            EDIT_LINE_HISTORY_SHEET_FOLDERS: 'LHS_FOLDER_EDIT',
            DELETE_LINE_HISTORY_SHEET_FOLDERS: 'LHS_FOLDER_DELETE',
            LHS_CREATE_FOLDER: 'LHS_FOLDER_CREATE',
            LHS_VIEW_FOLDER: 'LHS_FOLDER_VIEW',
            LHS_EDIT_FOLDER: 'LHS_FOLDER_EDIT',
            LHS_DELETE_FOLDER: 'LHS_FOLDER_DELETE',
        };
        return aliases[normalized] || normalized;
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

    private isBillingOrPlanningDepartment(name?: string | null) {
        const value = (name || '').toLowerCase();
        return value.includes('billing') || value.includes('planning');
    }

    private isHardcodedTaskResource(resource?: string | null) {
        return this.hardcodedTaskResources.includes(this.normalizeResource(resource));
    }

    private isHardcodedViewOnlyResource(resource?: string | null) {
        return this.hardcodedViewOnlyResources.includes(this.normalizeResource(resource));
    }

    private buildPolicyFlags(
        resource: string,
        flags: { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean },
    ) {
        if (this.isHardcodedViewOnlyResource(resource)) {
            return {
                canView: flags.canView,
                canCreate: false,
                canEdit: false,
                canDelete: false,
            };
        }

        if (this.isHardcodedTaskResource(resource)) {
            return {
                canView: flags.canView || flags.canCreate || flags.canEdit || flags.canDelete,
                canCreate: flags.canCreate,
                canEdit: flags.canEdit,
                canDelete: flags.canDelete,
            };
        }

        return flags;
    }

    private parseJsonLike(value: unknown): unknown {
        let current = value;
        for (let depth = 0; depth < 2; depth += 1) {
            if (typeof current !== 'string') return current;
            const trimmed = current.trim();
            if (!trimmed) return undefined;
            try {
                current = JSON.parse(trimmed);
            } catch {
                return current;
            }
        }
        return current;
    }

    private serializeJsonForGraphql(value: unknown) {
        if (value === null || value === undefined) return value;
        return typeof value === 'string' ? value : JSON.stringify(value);
    }

    private serializeTaskForGraphql<T extends Record<string, any>>(task: T): T {
        return {
            ...task,
            formSchema: this.serializeJsonForGraphql(task.formSchema),
            submissionData: this.serializeJsonForGraphql(task.submissionData),
            subtasks: Array.isArray(task.subtasks)
                ? task.subtasks.map((subtask: any) => ({
                    ...subtask,
                    formSchema: this.serializeJsonForGraphql(subtask.formSchema),
                    submissionData: this.serializeJsonForGraphql(subtask.submissionData),
                }))
                : task.subtasks,
        };
    }

    private resolveTaskResource(taskLike: { type?: string | null; formSchema?: unknown }) {
        const parsedSchema = this.parseJsonLike(taskLike.formSchema);
        if (parsedSchema && typeof parsedSchema === 'object' && !Array.isArray(parsedSchema)) {
            const schema = parsedSchema as Record<string, unknown>;
            const candidate = this.normalizeResource(
                String(schema.resource ?? schema.resourceKey ?? schema.accessResource ?? ''),
            );
            if (candidate) return candidate;
        }

        const rawType = (taskLike.type || '').trim();
        const resourceMatch = rawType.match(/^resource:(.+)$/i);
        if (resourceMatch?.[1]) {
            const resource = this.normalizeResource(resourceMatch[1]);
            if (resource) return resource;
        }

        return 'TASK';
    }

    private resolveTaskCreatorId(taskLike: { formSchema?: unknown }) {
        const parsedSchema = this.parseJsonLike(taskLike.formSchema);
        if (!parsedSchema || typeof parsedSchema !== 'object' || Array.isArray(parsedSchema)) return 0;
        return Number((parsedSchema as Record<string, unknown>).createdBy || 0);
    }

    private canPerformTaskResourceAction(
        accessMap: Record<string, { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }>,
        resource: string,
        action: 'canView' | 'canCreate' | 'canEdit' | 'canDelete',
    ) {
        const normalizedResource = this.normalizeResource(resource) || 'TASK';
        if (normalizedResource === 'TASK') {
            return this.canAccess(accessMap, 'TASK', action);
        }

        if (this.hasPolicyForAnyResource(accessMap, [normalizedResource])) {
            return this.canAccess(accessMap, normalizedResource, action);
        }

        return this.canAccess(accessMap, 'TASK', action);
    }

    private async getProjectUserContext(projectId: number, userId: number) {
        const projectUser = await this.prisma.projectUser.findUnique({
            where: { projectId_userId: { projectId, userId } },
            select: {
                userId: true,
                departmentId: true,
                projectRoleId: true,
                departmentRoleId: true,
            },
        });

        if (!projectUser) return null;

        const accessMap = await this.getAccessMapForProjectUser({
            projectRoleId: projectUser.projectRoleId,
            departmentRoleId: projectUser.departmentRoleId,
            departmentId: projectUser.departmentId,
        });

        return { projectUser, accessMap };
    }

    private async getAccessMapForProjectUser(projectUser: {
        projectRoleId: number | null;
        departmentRoleId: number | null;
        departmentId: number | null;
    }) {
        const accessMap: Record<string, { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }> = {};
        const department = projectUser.departmentId
            ? await this.prisma.department.findUnique({
                where: { id: projectUser.departmentId },
                select: { name: true },
            })
            : null;

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

        this.hardcodedTaskResources.forEach((resource) => {
            if (!accessMap[resource]) {
                this.setAccess(accessMap, resource, this.createEmptyAccess());
            }
        });

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
                fields: [],
                effectiveAccessPolicies: [],
            };
        }

        const accessMap = await this.getAccessMapForProjectUser({
            projectRoleId: membership.projectRoleId ?? null,
            departmentRoleId: membership.departmentRoleId ?? null,
            departmentId: membership.departmentId ?? null,
        });

        const canViewUsers = this.canAccess(accessMap, 'USER', 'canView');
        const canViewDepartments = this.canAccess(accessMap, 'DEPARTMENT', 'canView');
        const canViewWorkOrders = this.canAccess(accessMap, 'WORK_ORDER', 'canView');
        const fieldPolicyDefined = this.hasPolicyForAnyResource(accessMap, this.projectFieldResources);
        const canViewFields = fieldPolicyDefined
            ? this.hasAccessForAnyResource(accessMap, this.projectFieldResources, 'canView')
            : true;
        const visibleTasks = (project.tasks || []).filter((task: any) => {
            const isInViewerScope =
                !task.departmentId ||
                Number(task.departmentId) === Number(membership.departmentId) ||
                Number(task.assignedTo) === Number(viewerUserId);

            return isInViewerScope && this.canPerformTaskResourceAction(accessMap, this.resolveTaskResource(task), 'canView');
        });

        return {
            ...project,
            users: canViewUsers ? project.users : (project.users || []).filter((user: any) => Number(user.userId) === Number(viewerUserId)),
            departments: canViewDepartments ? project.departments : [],
            tasks: visibleTasks.map((task: any) => this.serializeTaskForGraphql(task)),
            workOrders: canViewWorkOrders ? project.workOrders : [],
            fields: canViewFields ? project.fields : [],
            effectiveAccessPolicies: this.buildEffectiveAccessPolicies(accessMap),
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

    async getWorkOrderViewUrl(projectId: number, workOrderId: number) {
        const workOrder = await this.prisma.workOrderPdf.findFirst({
            where: { id: workOrderId, projectId },
        });
        if (!workOrder) {
            throw new NotFoundException(`Work order with ID ${workOrderId} not found in project ${projectId}`);
        }

        return {
            fileName: workOrder.fileName,
            url: await this.storage.getPresignedUrl(workOrder.fileKey, workOrder.fileName),
        };
    }

    async assertCanViewWorkOrder(projectId: number, user: { userId?: number; role?: string }) {
        if (user?.role === 'admin') return true;

        const userId = Number(user?.userId);
        if (!userId) {
            throw new ForbiddenException('Work order access denied');
        }

        const context = await this.getProjectUserContext(projectId, userId);
        if (!context || !this.canAccess(context.accessMap, 'WORK_ORDER', 'canView')) {
            throw new ForbiddenException('Work order access denied');
        }

        return true;
    }

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
        const normalizedResource = this.normalizePolicyResource(resource);
        if (!normalizedResource) throw new ConflictException('Resource is required');
        if (!this.allowedPolicyResources.includes(normalizedResource)) {
            throw new ConflictException(`"${normalizedResource}" is not a configured hardcoded task/resource`);
        }
        const policyFlags = this.buildPolicyFlags(normalizedResource, { canView, canCreate, canEdit, canDelete });

        return this.prisma.departmentRolePolicy.upsert({
            where: {
                departmentRoleId_resource: {
                    departmentRoleId: roleId,
                    resource: normalizedResource,
                },
            },
            update: policyFlags,
            create: {
                departmentRoleId: roleId,
                resource: normalizedResource,
                ...policyFlags,
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
        const normalizedResource = this.normalizePolicyResource(resource);
        if (!this.allowedPolicyResources.includes(normalizedResource)) {
            throw new ConflictException(`"${normalizedResource}" is not a configured hardcoded task/resource`);
        }
        const policyFlags = this.buildPolicyFlags(normalizedResource, { canView, canCreate, canEdit, canDelete });

        // Prisma upsert cannot target a nullable member inside a composite unique
        // when that member is null, so we do a find+update/create for global permissions.
        if (departmentId === null) {
            const existing = await this.prisma.permission.findFirst({
                where: { projectRoleId: roleId, resource: normalizedResource, departmentId: null },
            });

            if (existing) {
                return this.prisma.permission.update({
                    where: { id: existing.id },
                    data: policyFlags,
                });
            }

            return this.prisma.permission.create({
                data: {
                    projectRoleId: roleId,
                    departmentId: null,
                    resource: normalizedResource,
                    ...policyFlags,
                },
            });
        }

        return this.prisma.permission.upsert({
            where: {
                projectRoleId_departmentId_resource: {
                    projectRoleId: roleId,
                    departmentId,
                    resource: normalizedResource,
                },
            },
            update: policyFlags,
            create: {
                projectRoleId: roleId,
                departmentId,
                resource: normalizedResource,
                ...policyFlags,
            },
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
        let accessMap: Record<string, { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }> | null = null;

        if (viewer && viewer.role !== 'admin') {
            const context = await this.getProjectUserContext(projectId, viewer.userId);
            if (!context) {
                return [];
            }
            const projectUser = context.projectUser;
            accessMap = context.accessMap;

            if (departmentId && projectUser.departmentId && departmentId !== projectUser.departmentId) {
                return [];
            }

            if (!departmentId && projectUser.departmentId) {
                scopedWhere = {
                    ...scopedWhere,
                    OR: [
                        { departmentId: projectUser.departmentId },
                        { departmentId: null },
                        { assignedTo: viewer.userId },
                    ],
                };
            }
        }

        const tasks = await this.prisma.task.findMany({
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

        if (!viewer || viewer.role === 'admin' || !accessMap) {
            return tasks.map((task) => this.serializeTaskForGraphql(task));
        }

        const viewerAccessMap = accessMap;
        return tasks
            .filter((task) => this.canPerformTaskResourceAction(viewerAccessMap, this.resolveTaskResource(task), 'canView'))
            .map((task) => this.serializeTaskForGraphql(task));
    }

    async createTask(projectId: number, data: {
        title: string;
        description?: string;
        departmentId?: number;
        assignedTo?: number;
        type?: string;
        formSchema?: string;
    }, viewer?: { userId: number; role?: string }) {
        let defaultDepartmentId: number | null = null;
        let defaultAssignedTo: number | null = null;

        if (viewer && viewer.role !== 'admin') {
            const context = await this.getProjectUserContext(projectId, viewer.userId);
            if (!context) {
                throw new ForbiddenException('You are not assigned to this project');
            }

            const resource = this.resolveTaskResource({
                type: data.type,
                formSchema: data.formSchema,
            });

            if (!this.canPerformTaskResourceAction(context.accessMap, resource, 'canCreate')) {
                throw new ForbiddenException(`You do not have create access for resource ${resource}`);
            }

            defaultDepartmentId = context.projectUser.departmentId ?? null;
            defaultAssignedTo = viewer.userId;
        }

        const parsedFormSchema = this.parseJsonLike(data.formSchema);
        let formSchemaForCreate = parsedFormSchema;
        if (viewer?.userId) {
            if (formSchemaForCreate && typeof formSchemaForCreate === 'object' && !Array.isArray(formSchemaForCreate)) {
                formSchemaForCreate = {
                    ...(formSchemaForCreate as Record<string, unknown>),
                    createdBy: viewer.userId,
                };
            } else {
                formSchemaForCreate = { createdBy: viewer.userId };
            }
        }

        const task = await this.prisma.task.create({
            data: {
                projectId,
                ...data,
                departmentId: data.departmentId ?? defaultDepartmentId,
                assignedTo: data.assignedTo ?? defaultAssignedTo,
                formSchema: formSchemaForCreate as any,
            },
            include: {
                assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
                department: true,
                subtasks: true,
            },
        });
        return this.serializeTaskForGraphql(task);
    }

    async updateTask(id: number, data: {
        title?: string;
        description?: string;
        status?: string;
        assignedTo?: number;
        submissionData?: string;
    }, viewer?: { userId: number; role?: string }) {
        const existingTask = await this.prisma.task.findUniqueOrThrow({
            where: { id },
            select: {
                id: true,
                projectId: true,
                type: true,
                formSchema: true,
                assignedTo: true,
            },
        });

        if (viewer && viewer.role !== 'admin') {
            const context = await this.getProjectUserContext(existingTask.projectId, viewer.userId);
            if (!context) {
                throw new ForbiddenException('You are not assigned to this project');
            }

            const resource = this.resolveTaskResource(existingTask);
            const canEditResource = this.canPerformTaskResourceAction(context.accessMap, resource, 'canEdit');
            const isAssignedWorker = Number(existingTask.assignedTo) === Number(viewer.userId);
            const changesDefinitionOrDelegation =
                data.title !== undefined ||
                data.description !== undefined ||
                data.assignedTo !== undefined;
            const creatorId = this.resolveTaskCreatorId(existingTask);

            if (data.assignedTo !== undefined && creatorId !== Number(viewer.userId)) {
                throw new ForbiddenException('Only the task creator can delegate this task');
            }

            if ((data.status || '').toLowerCase() === 'done' && creatorId !== Number(viewer.userId)) {
                throw new ForbiddenException('Only the task creator can validate task completion');
            }

            if (!canEditResource && !(isAssignedWorker && !changesDefinitionOrDelegation)) {
                throw new ForbiddenException(`You do not have edit access for resource ${resource}`);
            }
        }

        const parsedSubmissionData = this.parseJsonLike(data.submissionData);
        const task = await this.prisma.task.update({
            where: { id },
            data: {
                ...data,
                submissionData: parsedSubmissionData as any,
            },
            include: {
                assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
                department: true,
                subtasks: true,
            },
        });
        return this.serializeTaskForGraphql(task);
    }

    async removeTask(id: number, viewer?: { userId: number; role?: string }) {
        const existingTask = await this.prisma.task.findUniqueOrThrow({
            where: { id },
            select: {
                id: true,
                projectId: true,
                type: true,
                formSchema: true,
            },
        });

        if (viewer && viewer.role !== 'admin') {
            const context = await this.getProjectUserContext(existingTask.projectId, viewer.userId);
            if (!context) {
                throw new ForbiddenException('You are not assigned to this project');
            }

            const resource = this.resolveTaskResource(existingTask);
            if (!this.canPerformTaskResourceAction(context.accessMap, resource, 'canDelete')) {
                throw new ForbiddenException(`You do not have delete access for resource ${resource}`);
            }
        }

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
