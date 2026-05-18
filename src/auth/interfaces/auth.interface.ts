import { Admin, User } from '@prisma/client';
import { SignupDto } from '../dto/signup.dto';
import { LoginDto } from '../dto/login.dto';

export interface IAuthService {
    signup(signupDto: SignupDto): Promise<{
        access_token: string;
        refresh_token: string;
        expiresIn: number;
        admin: { id: number; firstName: string; lastName: string; email: string }
    }>;
    login(loginDto: LoginDto): Promise<{
        access_token: string;
        refresh_token: string;
        expiresIn: number;
        user?: any;
    }>;
    loginUser(loginDto: LoginDto): Promise<{
        access_token: string;
        refresh_token: string;
        expiresIn: number;
    }>;
    refreshTokens(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
    }>;
    validateAdmin(email: string, password: string): Promise<Omit<Admin, 'password'> | null>;
    validateUser(email: string, password: string): Promise<Omit<User, 'password'> | null>;
    logout(accessToken: string, user: any): Promise<{ message: string }>;
}
