import { Admin, User } from '@prisma/client';
import { SignupInput } from '../dto/signup.input';
import { LoginInput } from '../dto/login.input';

export interface IAuthService {
    signup(signupInput: SignupInput): Promise<{
        access_token: string;
        refresh_token: string;
        expiresIn: number;
        admin: { id: number; firstName: string; lastName: string; email: string }
    }>;
    login(loginInput: LoginInput): Promise<{
        access_token: string;
        refresh_token: string;
        expiresIn: number;
        user?: any;
    }>;
    loginUser(loginInput: LoginInput): Promise<{
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
