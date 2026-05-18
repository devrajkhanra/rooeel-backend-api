import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Req, Res, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { Response, Request } from 'express';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('signup')
    async signup(@Body() signupDto: SignupDto) {
        return this.authService.signup(signupDto);
    }

    @HttpCode(HttpStatus.OK)
    @Post('login')
    async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
        const tokens = await this.authService.login(loginDto);

        res.cookie('refreshToken', tokens.refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return {
            access_token: tokens.access_token,
            expiresIn: tokens.expiresIn,
        };
    }

    @HttpCode(HttpStatus.OK)
    @Post('refresh')
    async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const refreshToken = req.headers.cookie?.split('refreshToken=')[1]?.split(';')[0];

        if (!refreshToken) {
            throw new UnauthorizedException('Refresh token not found');
        }

        const tokens = await this.authService.refreshTokens(refreshToken);

        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return {
            access_token: tokens.accessToken,
            expiresIn: tokens.expiresIn,
        };
    }

    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @Post('logout')
    async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const accessToken = req.headers.authorization?.replace('Bearer ', '') || '';
        const user = (req as any).user;
        await this.authService.logout(accessToken, user);
        res.clearCookie('refreshToken');
        return { message: 'Logout successful' };
    }

    @HttpCode(HttpStatus.OK)
    @Post('user/login')
    async userLogin(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
        const tokens = await this.authService.loginUser(loginDto);

        res.cookie('refreshToken', tokens.refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return {
            access_token: tokens.access_token,
            expiresIn: tokens.expiresIn,
        };
    }

    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @Post('user/logout')
    async userLogout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const accessToken = req.headers.authorization?.replace('Bearer ', '') || '';
        const user = (req as any).user;
        await this.authService.logout(accessToken, user);
        res.clearCookie('refreshToken');
        return { message: 'Logout successful' };
    }
}
