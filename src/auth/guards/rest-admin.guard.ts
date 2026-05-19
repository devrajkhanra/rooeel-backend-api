import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RestAuthGuard } from './rest-auth.guard';

@Injectable()
export class RestAdminGuard extends RestAuthGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Run JWT authentication validation first
        const authenticated = await super.canActivate(context);
        if (!authenticated) {
            return false;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || user.role !== 'admin') {
            throw new ForbiddenException('Admin access required');
        }

        return true;
    }
}
