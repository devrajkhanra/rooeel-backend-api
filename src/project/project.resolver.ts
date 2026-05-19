import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ProjectService } from './services/project.service';
import { Project } from './models/project.model';
import { ProjectField, ProjectFieldValue } from './models/project-field.model';
import { ProjectUser } from './models/project-user.model';
import { WorkOrderPdf } from './models/work-order-pdf.model';
import { ProjectRole } from './models/project-role.model';
import { Department } from './models/department.model';
import { Permission } from './models/permission.model';
import { Task } from './models/task.model';
import { SubTask } from './models/subtask.model';
import { CreateProjectInput } from './dto/create-project.input';
import { UpdateProjectInput } from './dto/update-project.input';
import { CreateFieldInput } from './dto/create-field.input';
import { GqlAdminGuard } from '../auth/guards/gql-admin.guard';
import { GqlUserGuard } from '../auth/guards/gql-user.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CheckPermission } from '../auth/decorators/check-permission.decorator';
import { ProjectPermissionGuard } from '../auth/guards/project-permission.guard';

// ─── TASK INPUTS ──────────────────────────────────────────────
import { InputType, Field, ObjectType } from '@nestjs/graphql';
import { IsString, IsOptional, IsInt, IsBoolean } from 'class-validator';

@InputType()
class CreateTaskInput {
    @Field()
    @IsString()
    title: string;

    @Field({ nullable: true })
    @IsString()
    @IsOptional()
    description?: string;

    @Field(() => Int, { nullable: true })
    @IsInt()
    @IsOptional()
    departmentId?: number;

    @Field(() => Int, { nullable: true })
    @IsInt()
    @IsOptional()
    assignedTo?: number;

    @Field({ nullable: true })
    @IsString()
    @IsOptional()
    type?: string;

    @Field({ nullable: true })
    @IsString()
    @IsOptional()
    formSchema?: string;
}

@InputType()
class UpdateTaskInput {
    @Field({ nullable: true })
    @IsString()
    @IsOptional()
    title?: string;

    @Field({ nullable: true })
    @IsString()
    @IsOptional()
    description?: string;

    @Field({ nullable: true })
    @IsString()
    @IsOptional()
    status?: string;

    @Field(() => Int, { nullable: true })
    @IsInt()
    @IsOptional()
    assignedTo?: number;

    @Field({ nullable: true })
    @IsString()
    @IsOptional()
    submissionData?: string;
}

@InputType()
class CreateSubTaskInput {
    @Field()
    @IsString()
    title: string;

    @Field({ nullable: true })
    @IsString()
    @IsOptional()
    description?: string;

    @Field(() => Int, { nullable: true })
    @IsInt()
    @IsOptional()
    assignedTo?: number;

    @Field({ nullable: true })
    @IsString()
    @IsOptional()
    type?: string;

    @Field({ nullable: true })
    @IsString()
    @IsOptional()
    formSchema?: string;
}

@InputType()
class SetPermissionInput {
    @Field(() => Int)
    @IsInt()
    roleId: number;

    @Field()
    @IsString()
    resource: string;

    @Field(() => Int, { nullable: true })
    @IsInt()
    @IsOptional()
    departmentId?: number;

    @Field()
    @IsBoolean()
    canView: boolean;

    @Field()
    @IsBoolean()
    canCreate: boolean;

    @Field()
    @IsBoolean()
    canEdit: boolean;

    @Field()
    @IsBoolean()
    canDelete: boolean;
}

// ─── SCALAR RESPONSE ─────────────────────────────────────────

@ObjectType()
class BooleanResponse {
    @Field()
    success: boolean;
}

// ─── RESOLVER ────────────────────────────────────────────────

@Resolver(() => Project)
export class ProjectResolver {
    constructor(private readonly projectService: ProjectService) { }

    // ── PROJECT CRUD (Admin only) ─────────────────────────────

    @UseGuards(GqlAdminGuard)
    @Mutation(() => Project, { name: 'createProject' })
    create(
        @Args('createProjectInput') input: CreateProjectInput,
        @CurrentUser() admin: any,
    ) {
        return this.projectService.create(admin.userId, input);
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => [Project], { name: 'projects' })
    findAll() {
        return this.projectService.findAll();
    }

    @UseGuards(GqlUserGuard) // Both admin and user can see project details
    @Query(() => Project, { name: 'project' })
    findOne(@Args('id', { type: () => Int }) id: number) {
        return this.projectService.findOne(id);
    }

    @UseGuards(GqlAdminGuard)
    @Mutation(() => Project, { name: 'updateProject' })
    update(
        @Args('id', { type: () => Int }) id: number,
        @Args('updateProjectInput') input: UpdateProjectInput,
    ) {
        return this.projectService.update(id, input);
    }

    @UseGuards(GqlAdminGuard)
    @Mutation(() => Project, { name: 'removeProject' })
    remove(@Args('id', { type: () => Int }) id: number) {
        return this.projectService.remove(id);
    }

    // ── DYNAMIC FIELDS ────────────────────────────────────────

    @UseGuards(GqlUserGuard)
    @Query(() => [ProjectField], { name: 'projectFields' })
    getFields(@Args('projectId', { type: () => Int }) projectId: number) {
        return this.projectService.getFields(projectId);
    }

    @UseGuards(GqlAdminGuard)
    @Mutation(() => ProjectField, { name: 'addProjectField' })
    createField(
        @Args('projectId', { type: () => Int }) projectId: number,
        @Args('input') input: CreateFieldInput,
    ) {
        return this.projectService.createField(projectId, input);
    }

    @UseGuards(GqlAdminGuard)
    @Mutation(() => Boolean, { name: 'removeProjectField' })
    deleteField(@Args('fieldId', { type: () => Int }) fieldId: number) {
        return this.projectService.deleteField(fieldId);
    }

    @UseGuards(GqlAdminGuard)
    @Mutation(() => ProjectFieldValue, { name: 'setFieldValue' })
    setFieldValue(
        @Args('projectId', { type: () => Int }) projectId: number,
        @Args('fieldId', { type: () => Int }) fieldId: number,
        @Args('value') value: string,
    ) {
        return this.projectService.setFieldValue(projectId, fieldId, value);
    }

    // ── PROJECT MEMBERS ───────────────────────────────────────

    @UseGuards(GqlUserGuard)
    @Query(() => [ProjectUser], { name: 'projectUsers' })
    getUsers(@Args('projectId', { type: () => Int }) projectId: number) {
        return this.projectService.getUsers(projectId);
    }

    @UseGuards(GqlAdminGuard)
    @Mutation(() => ProjectUser, { name: 'assignUserToProject' })
    assignUser(
        @Args('projectId', { type: () => Int }) projectId: number,
        @Args('userId', { type: () => Int }) userId: number,
    ) {
        return this.projectService.assignUser(projectId, userId);
    }

    @UseGuards(GqlAdminGuard)
    @Mutation(() => Boolean, { name: 'unassignUserFromProject' })
    unassignUser(
        @Args('projectId', { type: () => Int }) projectId: number,
        @Args('userId', { type: () => Int }) userId: number,
    ) {
        return this.projectService.unassignUser(projectId, userId);
    }

    // ── WORK ORDERS (listed via GQL, upload via REST) ─────────

    @UseGuards(ProjectPermissionGuard)
    @CheckPermission('WORK_ORDER', 'view')
    @Query(() => [WorkOrderPdf], { name: 'workOrders' })
    getWorkOrders(@Args('projectId', { type: () => Int }) projectId: number) {
        return this.projectService.getWorkOrders(projectId);
    }

    @UseGuards(ProjectPermissionGuard)
    @CheckPermission('WORK_ORDER', 'delete')
    @Mutation(() => Boolean, { name: 'deleteWorkOrder' })
    deleteWorkOrder(@Args('workOrderId', { type: () => Int }) workOrderId: number) {
        return this.projectService.deleteWorkOrder(workOrderId);
    }

    // ── DYNAMIC ROLES ─────────────────────────────────────────

    @UseGuards(GqlAdminGuard)
    @Query(() => [ProjectRole], { name: 'projectRoles' })
    getRoles(@Args('projectId', { type: () => Int }) projectId: number) {
        return this.projectService.getRoles(projectId);
    }

    @UseGuards(GqlAdminGuard)
    @Mutation(() => ProjectRole, { name: 'createProjectRole' })
    createRole(
        @Args('projectId', { type: () => Int }) projectId: number,
        @Args('name') name: string,
    ) {
        return this.projectService.createRole(projectId, name);
    }

    @UseGuards(GqlAdminGuard)
    @Mutation(() => Boolean, { name: 'removeProjectRole' })
    removeRole(@Args('id', { type: () => Int }) id: number) {
        return this.projectService.removeRole(id);
    }

    @UseGuards(GqlAdminGuard)
    @Mutation(() => ProjectUser, { name: 'setUserRole' })
    setUserRole(
        @Args('projectId', { type: () => Int }) projectId: number,
        @Args('userId', { type: () => Int }) userId: number,
        @Args('roleId', { type: () => Int }) roleId: number,
    ) {
        return this.projectService.setUserRole(projectId, userId, roleId);
    }

    @UseGuards(GqlAdminGuard)
    @Mutation(() => ProjectUser, { name: 'unsetUserRole' })
    unsetUserRole(
        @Args('projectId', { type: () => Int }) projectId: number,
        @Args('userId', { type: () => Int }) userId: number,
    ) {
        return this.projectService.unsetUserRole(projectId, userId);
    }

    @UseGuards(GqlAdminGuard)
    @Mutation(() => ProjectUser, { name: 'changeUserRole' })
    changeUserRole(
        @Args('projectId', { type: () => Int }) projectId: number,
        @Args('userId', { type: () => Int }) userId: number,
        @Args('newRoleId', { type: () => Int }) newRoleId: number,
    ) {
        // changeUserRole is the same as setUserRole (upsert the FK)
        return this.projectService.setUserRole(projectId, userId, newRoleId);
    }

    // ── DEPARTMENTS ───────────────────────────────────────────

    @UseGuards(GqlUserGuard)
    @Query(() => [Department], { name: 'departments' })
    getDepartments(@Args('projectId', { type: () => Int }) projectId: number) {
        return this.projectService.getDepartments(projectId);
    }

    @UseGuards(GqlAdminGuard)
    @Mutation(() => Department, { name: 'createDepartment' })
    createDepartment(
        @Args('projectId', { type: () => Int }) projectId: number,
        @Args('name') name: string,
    ) {
        return this.projectService.createDepartment(projectId, name);
    }

    @UseGuards(GqlAdminGuard)
    @Mutation(() => Department, { name: 'updateDepartment' })
    updateDepartment(
        @Args('id', { type: () => Int }) id: number,
        @Args('name') name: string,
    ) {
        return this.projectService.updateDepartment(id, name);
    }

    @UseGuards(GqlAdminGuard)
    @Mutation(() => Boolean, { name: 'removeDepartment' })
    removeDepartment(@Args('id', { type: () => Int }) id: number) {
        return this.projectService.removeDepartment(id);
    }

    @UseGuards(GqlAdminGuard)
    @Mutation(() => ProjectUser, { name: 'assignUserToDepartment' })
    assignUserToDepartment(
        @Args('projectId', { type: () => Int }) projectId: number,
        @Args('userId', { type: () => Int }) userId: number,
        @Args('departmentId', { type: () => Int }) departmentId: number,
    ) {
        return this.projectService.assignUserToDepartment(projectId, userId, departmentId);
    }

    @UseGuards(GqlAdminGuard)
    @Mutation(() => ProjectUser, { name: 'removeUserFromDepartment' })
    removeUserFromDepartment(
        @Args('projectId', { type: () => Int }) projectId: number,
        @Args('userId', { type: () => Int }) userId: number,
    ) {
        return this.projectService.removeUserFromDepartment(projectId, userId);
    }

    // ── PERMISSIONS ───────────────────────────────────────────

    @UseGuards(GqlAdminGuard)
    @Query(() => [Permission], { name: 'permissions' })
    getPermissions(@Args('roleId', { type: () => Int }) roleId: number) {
        return this.projectService.getPermissions(roleId);
    }

    @UseGuards(GqlAdminGuard)
    @Mutation(() => Permission, { name: 'setPermission' })
    setPermission(@Args('input') input: SetPermissionInput) {
        return this.projectService.setPermission(
            input.roleId,
            input.resource,
            input.departmentId ?? null,
            input.canView,
            input.canCreate,
            input.canEdit,
            input.canDelete,
        );
    }

    @UseGuards(GqlAdminGuard)
    @Mutation(() => Boolean, { name: 'removePermission' })
    removePermission(@Args('id', { type: () => Int }) id: number) {
        return this.projectService.removePermission(id);
    }

    // ── TASKS ─────────────────────────────────────────────────

    @UseGuards(GqlUserGuard)
    @Query(() => [Task], { name: 'tasks' })
    getTasks(
        @Args('projectId', { type: () => Int }) projectId: number,
        @Args('departmentId', { type: () => Int, nullable: true }) departmentId?: number,
    ) {
        return this.projectService.getTasks(projectId, departmentId);
    }

    @UseGuards(GqlUserGuard)
    @Mutation(() => Task, { name: 'createTask' })
    createTask(
        @Args('projectId', { type: () => Int }) projectId: number,
        @Args('input') input: CreateTaskInput,
    ) {
        return this.projectService.createTask(projectId, input);
    }

    @UseGuards(GqlUserGuard)
    @Mutation(() => Task, { name: 'updateTask' })
    updateTask(
        @Args('id', { type: () => Int }) id: number,
        @Args('input') input: UpdateTaskInput,
    ) {
        return this.projectService.updateTask(id, input);
    }

    @UseGuards(GqlUserGuard)
    @Mutation(() => Boolean, { name: 'removeTask' })
    removeTask(@Args('id', { type: () => Int }) id: number) {
        return this.projectService.removeTask(id);
    }

    // ── SUBTASKS ──────────────────────────────────────────────

    @UseGuards(GqlUserGuard)
    @Mutation(() => SubTask, { name: 'createSubTask' })
    createSubTask(
        @Args('taskId', { type: () => Int }) taskId: number,
        @Args('input') input: CreateSubTaskInput,
    ) {
        return this.projectService.createSubTask(taskId, input);
    }

    @UseGuards(GqlUserGuard)
    @Mutation(() => SubTask, { name: 'updateSubTask' })
    updateSubTask(
        @Args('id', { type: () => Int }) id: number,
        @Args('input') input: UpdateTaskInput, // same shape
    ) {
        return this.projectService.updateSubTask(id, input);
    }

    @UseGuards(GqlUserGuard)
    @Mutation(() => Boolean, { name: 'removeSubTask' })
    removeSubTask(@Args('id', { type: () => Int }) id: number) {
        return this.projectService.removeSubTask(id);
    }
}