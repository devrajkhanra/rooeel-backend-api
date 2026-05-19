import {
    ExecutionContext,
    Injectable,
    UnauthorizedException,
    ForbiddenException,
    CanActivate,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSION_CHECK_KEY, PermissionMetadata } from '../decorators/check-permission.decorator';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ProjectPermissionGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const ctx = GqlExecutionContext.create(context);
        const req = ctx.getContext().req;

        // Ensure user is authenticated
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedException('Authentication required');
        }

        const token = authHeader.split(' ')[1];
        let payload: any;
        try {
            payload = this.jwtService.verify(token, {
                secret: this.configService.get('JWT_SECRET'),
            });
        } catch (err) {
            throw new UnauthorizedException('Invalid token');
        }

        req.user = {
            userId: payload.sub,
            email: payload.email,
            role: payload.role,
        };

        const user = req.user;

        // 1. Admins bypass all per-project permissions
        if (user.role === 'admin') {
            return true;
        }

        // Retrieve CheckPermission metadata
        const metadata = this.reflector.get<PermissionMetadata>(
            PERMISSION_CHECK_KEY,
            context.getHandler(),
        );

        // If no metadata exists, allow access (only GqlUserGuard is needed)
        if (!metadata) {
            return true;
        }

        const args = ctx.getArgs();
        let projectId = args.projectId;

        // Resolving projectId based on arguments and resource types if not direct
        if (!projectId) {
            if (args.fieldId) {
                const field = await this.prisma.projectField.findUnique({
                    where: { id: args.fieldId },
                });
                projectId = field?.projectId;
            } else if (args.workOrderId) {
                const wo = await (this.prisma as any).workOrderPdf.findUnique({
                    where: { id: args.workOrderId },
                });
                projectId = wo?.projectId;
            } else if (args.id) {
                // Determine source table based on metadata resource
                if (metadata.resource === 'DEPARTMENT') {
                    const dept = await (this.prisma as any).department.findUnique({
                        where: { id: args.id },
                    });
                    projectId = dept?.projectId;
                } else if (metadata.resource === 'TASK') {
                    const task = await this.prisma.task.findUnique({
                        where: { id: args.id },
                    });
                    projectId = task?.projectId;
                } else if (metadata.resource === 'SUBTASK') {
                    const subtask = await (this.prisma as any).subTask.findUnique({
                        where: { id: args.id },
                        include: { task: true },
                    });
                    projectId = subtask?.task?.projectId;
                }
            } else if (args.taskId) {
                const task = await this.prisma.task.findUnique({
                    where: { id: args.taskId },
                });
                projectId = task?.projectId;
            }
        }

        if (!projectId) {
            throw new ForbiddenException('Could not determine Project context for permission check');
        }

        // Look up ProjectUser record for the user on this project
        const projectUser = await (this.prisma.projectUser.findUnique as any)({
            where: {
                projectId_userId: {
                    projectId,
                    userId: user.userId,
                },
            },
            include: {
                projectRole: {
                    include: {
                        permissions: {
                            where: { resource: metadata.resource },
                        },
                    },
                },
            },
        });

        if (!projectUser) {
            throw new ForbiddenException('You are not assigned to this project');
        }

        const role = (projectUser as any).projectRole;
        if (!role) {
            throw new ForbiddenException('No role assigned in this project');
        }

        // Find permission matching resource (and optionally check department scope if applicable)
        const permission = role.permissions.find(p => p.resource === metadata.resource);
        if (!permission) {
            throw new ForbiddenException(`No permission defined for ${metadata.resource} on your role`);
        }

        // Check task/subtask department scope restrictions:
        // "User can see and submit a task/subtask assigned to them or their department only based on permission"
        if (metadata.resource === 'TASK' || metadata.resource === 'SUBTASK') {
            // Check if permission is department-scoped (i.e. permission has departmentId defined)
            if (permission.departmentId && (projectUser as any).departmentId !== permission.departmentId) {
                throw new ForbiddenException('You do not belong to the department required for this operation');
            }
        }

        // Validate the specific action flag
        let isAllowed = false;
        switch (metadata.action) {
            case 'view':
                isAllowed = permission.canView;
                break;
            case 'create':
                isAllowed = permission.canCreate;
                break;
            case 'edit':
                isAllowed = permission.canEdit;
                break;
            case 'delete':
                isAllowed = permission.canDelete;
                break;
        }

        if (!isAllowed) {
            throw new ForbiddenException(
                `Access Denied: You do not have permission to ${metadata.action} ${metadata.resource} on this project`
            );
        }

        return true;
    }
}
