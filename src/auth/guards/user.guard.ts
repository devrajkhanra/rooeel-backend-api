import { Injectable, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

@Injectable()
export class UserGuard extends JwtAuthGuard {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        // First, ensure the user is authenticated via JWT
        const isAuthenticated = await super.canActivate(context);

        if (!isAuthenticated) {
            return false;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        // Check if the user has user role
        if (!user || user.role !== 'user') {
            throw new ForbiddenException('Only users can perform this action');
        }

        return true;
    }
}
