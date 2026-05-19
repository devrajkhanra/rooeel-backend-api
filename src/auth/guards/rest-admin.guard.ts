import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class RestAdminGuard extends AuthGuard('jwt') {
    // Overriding handleRequest lets Passport manage the async Observable natively.
    handleRequest(err, user, info) {
        // 1. Verify the JWT exists and is valid
        if (err || !user) {
            throw err || new UnauthorizedException('Authentication required');
        }

        // 2. Authorize the user's role
        if (user.role !== 'admin') {
            throw new ForbiddenException('Admin access required');
        }

        // 3. Return the user object so NestJS can inject it into the @Request() decorator
        return user;
    }
}