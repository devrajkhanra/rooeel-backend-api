
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './services/auth.service';
import { AdminService } from '../admin/services/admin.service';
import { UserService } from '../user/services/user.service';
import { PasswordService } from '../common/services/password.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('AuthService', () => {
    let authService: AuthService;
    let adminService: AdminService;
    let passwordService: PasswordService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: AdminService, useValue: { findByEmail: jest.fn() } },
                { provide: UserService, useValue: {} },
                {
                    provide: PasswordService,
                    useValue: {
                        hash: jest.fn().mockImplementation((p) => Promise.resolve(`hashed_${p}`)),
                        compare: jest.fn().mockImplementation((p, h) => Promise.resolve(h === `hashed_${p}`)),
                    },
                },
                { provide: PrismaService, useValue: { refreshToken: { create: jest.fn() } } },
                { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('15m') } },
                { provide: CACHE_MANAGER, useValue: { set: jest.fn() } },
                {
                    provide: JwtService,
                    useValue: {
                        sign: (payload) => 'mock_token',
                    },
                },
            ],
        }).compile();

        authService = module.get<AuthService>(AuthService);
        adminService = module.get<AdminService>(AdminService);
        passwordService = module.get<PasswordService>(PasswordService);
    });

    it('should validate admin with correct credentials', async () => {
        const mockEmail = 'test@admin.com';
        const mockPassword = 'password123';
        const mockHashedPassword = await passwordService.hash(mockPassword);

        jest.spyOn(adminService, 'findByEmail').mockResolvedValue({
            id: 1,
            email: mockEmail,
            password: mockHashedPassword,
            firstName: 'Test',
            lastName: 'Admin',
            createdAt: new Date(),
        });

        const user = await authService.validateAdmin(mockEmail, mockPassword);
        expect(user).toBeTruthy();
        expect(user.email).toBe(mockEmail);
    });

    it('should return null for invalid password', async () => {
        const mockEmail = 'test@admin.com';
        const mockPassword = 'password123';
        const mockHashedPassword = await passwordService.hash(mockPassword);

        jest.spyOn(adminService, 'findByEmail').mockResolvedValue({
            id: 1,
            email: mockEmail,
            password: mockHashedPassword,
            firstName: 'Test',
            lastName: 'Admin',
            createdAt: new Date(),
        });

        const user = await authService.validateAdmin(mockEmail, 'wrongpassword');
        expect(user).toBeNull();
    });

    it('should login and return token', async () => {
        const mockEmail = 'test@admin.com';
        const mockPassword = 'password123';
        const mockHashedPassword = await passwordService.hash(mockPassword);

        jest.spyOn(adminService, 'findByEmail').mockResolvedValue({
            id: 1,
            email: mockEmail,
            password: mockHashedPassword,
            firstName: 'Test',
            lastName: 'Admin',
            createdAt: new Date(),
        });

        const result = await authService.login({ email: mockEmail, password: mockPassword, role: 'admin' });
        expect(result.access_token).toBe('mock_token');
        expect(result.refresh_token).toBe('mock_token');
        expect(result.user.email).toBe(mockEmail);
    });
});
