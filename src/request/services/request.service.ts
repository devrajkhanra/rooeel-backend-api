import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRequestDto } from '../dto/create-request.dto';
import {
    IRequestService,
    RequestWithRelations,
    RequestWithAdmin,
    RequestWithUser,
    GeneratePasswordResult,
} from '../interfaces/request.interface';
import { CustomLogger } from '../../logger/logger.service';
import { UserRequest } from '@prisma/client';
import { PasswordService } from '../../common/services/password.service';
import { EmailService } from '../../common/services/email.service';
import * as bcrypt from 'bcrypt';

/** Request types that involve password actions (admin must generate the password) */
const PASSWORD_REQUEST_TYPES = ['password', 'password_reset'] as const;

@Injectable()
export class RequestService implements IRequestService {
    private readonly logger: CustomLogger;

    constructor(
        private readonly prisma: PrismaService,
        private readonly passwordService: PasswordService,
        private readonly emailService: EmailService,
    ) {
        this.logger = new CustomLogger();
        this.logger.setContext(RequestService.name);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CREATE — authenticated user submitting a change request
    // ─────────────────────────────────────────────────────────────────────────

    async createRequest(userId: number, createRequestDto: CreateRequestDto): Promise<UserRequest> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { admin: true },
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${userId} not found`);
        }

        if (!user.createdBy) {
            throw new BadRequestException('User does not have an assigned admin');
        }

        // Authenticated password change: verify current password
        if (createRequestDto.requestType === 'password') {
            if (!createRequestDto.currentPassword) {
                throw new BadRequestException('Current password is required for password change requests');
            }
            const isPasswordValid = await bcrypt.compare(
                createRequestDto.currentPassword,
                user.password,
            );
            if (!isPasswordValid) {
                throw new BadRequestException('Current password is incorrect');
            }
        }

        // For non-password types, store the current value for the admin's reference
        let currentValue: string | null = null;
        if (!PASSWORD_REQUEST_TYPES.includes(createRequestDto.requestType as any)) {
            currentValue = user[createRequestDto.requestType as keyof typeof user] as string;
        }

        this.logger.debug(`Creating ${createRequestDto.requestType} request for user ${user.email}`);

        const request = await this.prisma.userRequest.create({
            data: {
                userId,
                adminId: user.createdBy,
                requestType: createRequestDto.requestType,
                currentValue,
                // For password types, never store the requested value — admin will generate one
                requestedValue: PASSWORD_REQUEST_TYPES.includes(createRequestDto.requestType as any)
                    ? '[HIDDEN]'
                    : createRequestDto.requestedValue ?? null,
                status: 'pending',
            },
        });

        this.logger.log(`Request created: ${request.requestType} (ID: ${request.id}) for user ${user.email}`);
        return request;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FORGOT PASSWORD — public endpoint, unauthenticated
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Sends a temporary password directly to the user's email.
     * Does NOT require authentication. The user provides their email.
     * Returns a generic success message regardless of whether the email exists
     * (to prevent user enumeration).
     */
    async forgotPassword(email: string): Promise<{ message: string }> {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        // Always return success to prevent user enumeration
        if (!user) {
            this.logger.debug(`Forgot password attempt for non-existent email: ${email}`);
            return { message: 'If an account exists with this email, a temporary password has been sent.' };
        }

        // Generate a temporary password
        const temporaryPassword = this.passwordService.generateRandom();
        const hashedPassword = await this.passwordService.hash(temporaryPassword);

        // Update user's password
        await this.prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword },
        });

        // Send email with temporary password
        await this.emailService.sendPasswordResetEmail(
            user.email,
            user.firstName,
            temporaryPassword,
        );

        this.logger.log(`Password reset email sent to user ${email}`);
        return { message: 'If an account exists with this email, a temporary password has been sent.' };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // READ
    // ─────────────────────────────────────────────────────────────────────────

    async findAllByUser(userId: number): Promise<RequestWithAdmin[]> {
        return this.prisma.userRequest.findMany({
            where: { userId },
            include: {
                admin: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findAllByAdmin(adminId: number): Promise<RequestWithUser[]> {
        return this.prisma.userRequest.findMany({
            where: { adminId },
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: number): Promise<RequestWithRelations | null> {
        return this.prisma.userRequest.findUnique({
            where: { id },
            include: {
                user: { select: { id: true, firstName: true, lastName: true, email: true } },
                admin: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN ACTIONS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Admin generates a cryptographically random password for the user.
     * Works for both 'password' (change) and 'password_reset' (forgot) request types.
     * The generated plain-text password is returned ONCE — admin must share it with the user.
     */
    async generatePassword(id: number, adminId: number): Promise<GeneratePasswordResult> {
        const request = await this.findOne(id);

        if (!request) {
            throw new NotFoundException(`Request with ID ${id} not found`);
        }

        if (request.adminId !== adminId) {
            throw new ForbiddenException('You can only generate passwords for your own users\' requests');
        }

        if (request.status !== 'pending') {
            throw new BadRequestException(`Request is already ${request.status}`);
        }

        if (!PASSWORD_REQUEST_TYPES.includes(request.requestType as any)) {
            throw new BadRequestException(
                `Generate password is only valid for password requests, not '${request.requestType}'`,
            );
        }

        this.logger.debug(`Generating password for request ${id} (${request.requestType}) — user: ${request.user?.email}`);

        // Generate and hash the new password
        const plainPassword = this.passwordService.generateRandom();
        const hashedPassword = await this.passwordService.hash(plainPassword);

        // Apply the new password to the user
        await this.prisma.user.update({
            where: { id: request.userId },
            data: { password: hashedPassword },
        });

        // Mark request as approved
        await this.prisma.userRequest.update({
            where: { id },
            data: { status: 'approved' },
        });

        this.logger.log(`Password generated for user ${request.user?.email} via request ${id}`);

        return {
            message: 'Password generated and applied successfully. Share this password with the user — it will not be shown again.',
            generatedPassword: plainPassword,
            requestId: id,
            userId: request.userId,
        };
    }

    async approveRequest(id: number, adminId: number): Promise<UserRequest> {
        const request = await this.findOne(id);

        if (!request) {
            throw new NotFoundException(`Request with ID ${id} not found`);
        }

        if (request.adminId !== adminId) {
            throw new ForbiddenException('You can only approve requests from your users');
        }

        if (request.status !== 'pending') {
            throw new BadRequestException(`Request is already ${request.status}`);
        }

        // Password requests must use generate-password endpoint instead
        if (PASSWORD_REQUEST_TYPES.includes(request.requestType as any)) {
            throw new BadRequestException(
                'Use POST /request/:id/generate-password to handle password requests',
            );
        }

        this.logger.debug(`Approving request ${id}: ${request.requestType} for user ${request.user?.email}`);

        const updateData: Record<string, any> = {};
        updateData[request.requestType] = request.requestedValue;

        await this.prisma.user.update({
            where: { id: request.userId },
            data: updateData,
        });

        const updatedRequest = await this.prisma.userRequest.update({
            where: { id },
            data: { status: 'approved' },
        });

        this.logger.log(`Request ${id} approved: ${request.requestType} for user ${request.user?.email}`);
        return updatedRequest;
    }

    async rejectRequest(id: number, adminId: number): Promise<UserRequest> {
        const request = await this.findOne(id);

        if (!request) {
            throw new NotFoundException(`Request with ID ${id} not found`);
        }

        if (request.adminId !== adminId) {
            throw new ForbiddenException('You can only reject requests from your users');
        }

        if (request.status !== 'pending') {
            throw new BadRequestException(`Request is already ${request.status}`);
        }

        this.logger.debug(`Rejecting request ${id}: ${request.requestType} for user ${request.user?.email}`);

        const updatedRequest = await this.prisma.userRequest.update({
            where: { id },
            data: { status: 'rejected' },
        });

        this.logger.log(`Request ${id} rejected: ${request.requestType} for user ${request.user?.email}`);
        return updatedRequest;
    }
}
