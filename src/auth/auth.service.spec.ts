
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { AdminService } from '../admin/services/admin.service';
import { PasswordService } from '../admin/services/password.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
    let authService: AuthService;
    let adminService: AdminService;
    let passwordService: PasswordService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                AdminService,
                PasswordService,
                PrismaService,
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

        const token = await authService.login({ email: mockEmail, password: mockPassword });
        expect(token).toEqual({ access_token: 'mock_token' });
    });
});
