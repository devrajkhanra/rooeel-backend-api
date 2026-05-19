import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAdminInput } from '../dto/create-admin.input';
import { UpdateAdminInput } from '../dto/update-admin.input';
import { IAdminService } from '../interfaces/admin.interface';
import { PasswordService } from '../../common/services/password.service';
import { CustomLogger } from '../../logger/logger.service';
import { Admin } from '@prisma/client';

@Injectable()
export class AdminService implements IAdminService {
    private readonly logger: CustomLogger;

    constructor(
        private readonly prisma: PrismaService,
        private readonly passwordService: PasswordService,
    ) {
        this.logger = new CustomLogger();
        this.logger.setContext(AdminService.name);
    }

    async create(createAdminInput: CreateAdminInput): Promise<Admin> {
        this.logger.debug(`Creating admin: ${createAdminInput.email}`);
        const hashedPassword = await this.passwordService.hash(createAdminInput.password);
        const admin = await this.prisma.admin.create({
            data: {
                firstName: createAdminInput.firstName,
                lastName: createAdminInput.lastName,
                email: createAdminInput.email,
                password: hashedPassword,
            },
        });
        this.logger.log(`Admin created successfully: ${admin.email} (ID: ${admin.id})`);
        return admin;
    }

    async findAll(): Promise<Admin[]> {
        return this.prisma.admin.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: number): Promise<Admin | null> {
        const admin = await this.prisma.admin.findUnique({
            where: { id },
        });
        return admin;
    }

    async update(id: number, updateAdminInput: UpdateAdminInput): Promise<Admin> {
        const admin = await this.findOne(id);
        if (!admin) {
            throw new NotFoundException(`Admin with ID ${id} not found`);
        }

        this.logger.debug(`Updating admin: ${admin.email} (ID: ${id})`);
        const data: any = { ...updateAdminInput };
        if (updateAdminInput.password) {
            data.password = await this.passwordService.hash(updateAdminInput.password);
        }

        const updatedAdmin = await this.prisma.admin.update({
            where: { id },
            data,
        });
        this.logger.log(`Admin updated successfully: ${updatedAdmin.email} (ID: ${id})`);
        return updatedAdmin;
    }

    async remove(id: number): Promise<void> {
        const admin = await this.findOne(id);
        if (!admin) {
            throw new NotFoundException(`Admin with ID ${id} not found`);
        }
        this.logger.warn(`Deleting admin: ${admin.email} (ID: ${id})`);
        await this.prisma.admin.delete({ where: { id } });
        this.logger.log(`Admin deleted successfully: ${admin.email} (ID: ${id})`);
    }

    async findByEmail(email: string): Promise<Admin | null> {
        return this.prisma.admin.findUnique({
            where: { email },
        });
    }
}

