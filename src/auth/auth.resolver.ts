import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { LoginInput } from './dto/login.input';
import { SignupInput } from './dto/signup.input';
import { AuthResponse } from './models/auth-response.model';
import { LogoutResponse } from './models/logout-response.model';
import { MessageResponse } from './models/message-response.model';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Request, Response } from 'express';

@Resolver()
export class AuthResolver {
    constructor(private readonly authService: AuthService) { }

    private getRefreshCookieOptions() {
        return {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax' as const,
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        };
    }

    private extractRefreshTokenFromCookies(cookieHeader?: string): string | null {
        if (!cookieHeader) return null;
        const match = cookieHeader.match(/(?:^|;\s*)refreshToken=([^;]+)/);
        return match?.[1] ?? null;
    }

    @Mutation(() => AuthResponse, { name: 'signup' })
    async signup(
        @Args('signupInput') signupInput: SignupInput,
        @Context() context: { res: Response },
    ) {
        const response = await this.authService.signup(signupInput);

        // Set HTTP-only cookie
        context.res.cookie('refreshToken', response.refresh_token, this.getRefreshCookieOptions());

        return {
            access_token: response.access_token,
            expiresIn: response.expiresIn,
            admin: response.admin,
        };
    }

    @Mutation(() => AuthResponse, { name: 'login' })
    async login(
        @Args('loginInput') loginInput: LoginInput,
        @Context() context: { res: Response },
    ) {
        const response = await this.authService.login(loginInput);

        context.res.cookie('refreshToken', response.refresh_token, this.getRefreshCookieOptions());

        return {
            access_token: response.access_token,
            expiresIn: response.expiresIn,
            user: loginInput.role === 'user' ? response.user : undefined,
            admin: loginInput.role === 'admin' ? response.user : undefined,
        };
    }

    @Mutation(() => AuthResponse, { name: 'refreshToken' })
    async refreshTokens(
        @Context() context: { req: Request; res: Response },
    ) {
        // Extract token from cookie string manually or via cookie-parser
        const refreshToken = this.extractRefreshTokenFromCookies(context.req.headers.cookie);

        if (!refreshToken) {
            throw new UnauthorizedException('Refresh token not found');
        }

        const tokens = await this.authService.refreshTokens(refreshToken);

        context.res.cookie('refreshToken', tokens.refreshToken, this.getRefreshCookieOptions());

        return {
            access_token: tokens.accessToken,
            expiresIn: tokens.expiresIn,
        };
    }

    @UseGuards(JwtAuthGuard)
    @Mutation(() => LogoutResponse, { name: 'logout' })
    async logout(
        @Context() context: { req: Request; res: Response },
    ) {
        const accessToken = context.req.headers.authorization?.replace('Bearer ', '') || '';
        const user = (context.req as any).user;

        await this.authService.logout(accessToken, user);

        // Clear the cookie
        context.res.clearCookie('refreshToken', {
            ...this.getRefreshCookieOptions(),
            maxAge: undefined,
        });

        return { message: 'Logout successful' };
    }

    @Mutation(() => MessageResponse, { name: 'forgotPassword' })
    async forgotPassword(@Args('email') email: string) {
        return this.authService.forgotPassword(email);
    }

    @Mutation(() => MessageResponse, { name: 'resetPassword' })
    async resetPassword(
        @Args('token') token: string,
        @Args('newPassword') newPassword: string,
    ) {
        return this.authService.resetPassword(token, newPassword);
    }
}
