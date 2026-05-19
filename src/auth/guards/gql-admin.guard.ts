import { ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GqlAdminGuard extends AuthGuard('jwt') {
    getRequest(context: ExecutionContext) {
        const ctx = GqlExecutionContext.create(context);
        return ctx.getContext().req;
    }

    handleRequest(err, user, info) {
        if (err || !user) {
            throw err || new UnauthorizedException('Authentication required');
        }
        // Assuming your token payload includes a role or boolean for admin
        // Replace `user.isAdmin` with your actual admin verification logic
        if (user.role !== 'admin') {
            throw new ForbiddenException('Admin access required');
        }
        return user;
    }
}