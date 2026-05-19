import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { LoginInput } from './dto/login.input';
import { SignupInput } from './dto/signup.input';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RestAuthGuard } from './guards/rest-auth.guard';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('signup')
    async signup(@Body() signupInput: SignupInput) {
        return this.authService.signup(signupInput);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() loginInput: LoginInput) {
        return this.authService.login(loginInput);
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
        const tokens = await this.authService.refreshTokens(refreshTokenDto.refreshToken);
        return {
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken,
            expiresIn: tokens.expiresIn,
        };
    }

    @UseGuards(RestAuthGuard)
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(@Req() req: any) {
        const authHeader = req.headers.authorization;
        const accessToken = authHeader?.replace('Bearer ', '') || '';
        const user = req.user;
        return this.authService.logout(accessToken, user);
    }
}
