import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { ProjectService } from './services/project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@UseGuards(JwtAuthGuard, AdminGuard) // Locks the entire controller down to Admins only
@Controller('project')
export class ProjectController {
    constructor(private readonly projectService: ProjectService) { }

    @Post()
    create(@Req() req: any, @Body() createProjectDto: CreateProjectDto) {
        // Extract the admin's ID from the JWT payload
        const adminId = req.user.userId;
        return this.projectService.create(adminId, createProjectDto);
    }

    @Get()
    findAll() {
        return this.projectService.findAll();
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.projectService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() updateProjectDto: UpdateProjectDto) {
        return this.projectService.update(id, updateProjectDto);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.projectService.remove(id);
    }

    // --- DYNAMIC FIELDS ---
    @Get(':id/fields')
    getFields(@Param('id', ParseIntPipe) id: number) {
        return this.projectService.getFields(id);
    }

    @Post(':id/fields')
    createField(@Param('id', ParseIntPipe) id: number, @Body() data: any) {
        return this.projectService.createField(id, data);
    }

    @Delete(':id/fields/:fieldId')
    deleteField(@Param('fieldId', ParseIntPipe) fieldId: number) {
        return this.projectService.deleteField(fieldId);
    }

    // --- DYNAMIC FIELD VALUES ---
    @Post(':id/fields/:fieldId/value')
    saveFieldValue(
        @Param('id', ParseIntPipe) id: number,
        @Param('fieldId', ParseIntPipe) fieldId: number,
        @Body() body: { value: string }
    ) {
        return this.projectService.saveFieldValue(id, fieldId, body.value);
    }

    // --- PROJECT USERS (MEMBERS) ---
    @Get(':id/users')
    getUsers(@Param('id', ParseIntPipe) id: number) {
        return this.projectService.getUsers(id);
    }

    @Post(':id/users')
    assignUser(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { userId: number; role?: string }
    ) {
        return this.projectService.assignUser(id, body.userId, body.role);
    }

    @Delete(':id/users/:userId')
    unassignUser(
        @Param('id', ParseIntPipe) id: number,
        @Param('userId', ParseIntPipe) userId: number
    ) {
        return this.projectService.unassignUser(id, userId);
    }

    // --- TASKS ---
    @Get(':id/tasks')
    getTasks(@Param('id', ParseIntPipe) id: number) {
        return this.projectService.getTasks(id);
    }

    @Post(':id/tasks')
    createTask(@Param('id', ParseIntPipe) id: number, @Body() data: any) {
        return this.projectService.createTask(id, data);
    }

    @Delete(':id/tasks/:taskId')
    deleteTask(@Param('taskId', ParseIntPipe) taskId: number) {
        return this.projectService.deleteTask(taskId);
    }
}