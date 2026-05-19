import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserInput } from '../dto/create-user.input';
import { UpdateUserInput } from '../dto/update-user.input';
import { IUserService } from '../interfaces/user.interface';
import { PasswordService } from '../../common/services/password.service';
import { EmailService } from '../../common/services/email.service';
import { CustomLogger } from '../../logger/logger.service';
import { User } from '@prisma/client';

@Injectable()
export class UserService implements IUserService {
    private readonly logger: CustomLogger;

    constructor(
        private readonly prisma: PrismaService,
        private readonly passwordService: PasswordService,
        private readonly emailService: EmailService,
    ) {
        this.logger = new CustomLogger();
        this.logger.setContext(UserService.name);
    }

    async create(createUserInput: CreateUserInput, adminId: number): Promise<User> {
        // Check if user already exists
        const existingUser = await this.findByEmail(createUserInput.email);
        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        this.logger.debug(`Creating user: ${createUserInput.email} by admin ID: ${adminId}`);
        const hashedPassword = await this.passwordService.hash(createUserInput.password);
        const user = await this.prisma.user.create({
            data: {
                firstName: createUserInput.firstName,
                lastName: createUserInput.lastName,
                email: createUserInput.email,
                password: hashedPassword,
                createdBy: adminId,
            },
        });
        this.logger.log(`User created successfully: ${user.email} (ID: ${user.id}) by admin ID: ${adminId}`);
        return user;
    }

    async findAll(): Promise<User[]> {
        return this.prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: number): Promise<User | null> {
        const user = await this.prisma.user.findUnique({
            where: { id },
        });
        return user;
    }

    async update(id: number, updateUserInput: UpdateUserInput): Promise<User> {
        const user = await this.findOne(id);
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        this.logger.debug(`Updating user: ${user.email} (ID: ${id})`);
        const data: any = { ...updateUserInput };
        if (updateUserInput.password) {
            data.password = await this.passwordService.hash(updateUserInput.password);
        }

        const updatedUser = await this.prisma.user.update({
            where: { id },
            data,
        });
        this.logger.log(`User updated successfully: ${updatedUser.email} (ID: ${id})`);
        return updatedUser;
    }

    async remove(id: number): Promise<void> {
        const user = await this.findOne(id);
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }
        this.logger.warn(`Deleting user: ${user.email} (ID: ${id})`);
        await this.prisma.user.delete({ where: { id } });
        this.logger.log(`User deleted successfully: ${user.email} (ID: ${id})`);
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { email },
        });
    }

    async resetPassword(id: number, adminId: number, password: string): Promise<User> {
        const user = await this.findOne(id);
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        // Verify that the user was created by this admin
        if (user.createdBy !== adminId) {
            throw new ForbiddenException('You can only reset passwords for users you created');
        }

        this.logger.debug(`Resetting password for user: ${user.email} (ID: ${id})`);
        const hashedPassword = await this.passwordService.hash(password);

        // Generate a temporary password for admin to share with user
        const plainPassword = password;

        await this.prisma.user.update({
            where: { id },
            data: { password: hashedPassword },
        });

        // Send email to user with the temporary password
        await this.emailService.sendPasswordResetEmail(
            user.email,
            user.firstName,
            plainPassword,
        );

        this.logger.log(`Password reset successfully for user: ${user.email} (ID: ${id}) by admin ID: ${adminId}`);
        return user;
    }

    async updateMyProfile(userId: number, updateUserInput: UpdateUserInput): Promise<User> {
        const user = await this.findOne(userId);
        if (!user) {
            throw new NotFoundException(`User with ID ${userId} not found`);
        }

        // If email is being changed, check it's not already taken
        if (updateUserInput.email && updateUserInput.email !== user.email) {
            const existingUser = await this.findByEmail(updateUserInput.email);
            if (existingUser) {
                throw new ConflictException('Email is already in use');
            }
        }

        this.logger.debug(`User ${user.email} (ID: ${userId}) updating their profile`);

        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: {
                firstName: updateUserInput.firstName ?? user.firstName,
                lastName: updateUserInput.lastName ?? user.lastName,
                email: updateUserInput.email ?? user.email,
            },
        });

        this.logger.log(`User profile updated successfully: ${updatedUser.email} (ID: ${userId})`);
        return updatedUser;
    }

    async changeMyPassword(userId: number, currentPassword: string, newPassword: string): Promise<{ message: string }> {
        const user = await this.findOne(userId);
        if (!user) {
            throw new NotFoundException(`User with ID ${userId} not found`);
        }

        // Verify current password
        const isPasswordValid = await this.passwordService.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            throw new ForbiddenException('Current password is incorrect');
        }

        const hashedPassword = await this.passwordService.hash(newPassword);
        await this.prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });

        this.logger.log(`Password changed successfully for user: ${user.email} (ID: ${userId})`);
        return { message: 'Password changed successfully' };
    }
}
