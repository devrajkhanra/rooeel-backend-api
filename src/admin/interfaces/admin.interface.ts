import { CreateAdminDto } from '../dto/create-admin.dto';
import { UpdateAdminDto } from '../dto/update-admin.dto';
import { Admin } from '@prisma/client';

export interface IAdminService {
    create(createAdminDto: CreateAdminDto): Promise<Admin>;
    findAll(): Promise<Admin[]>;
    findOne(id: number): Promise<Admin | null>;
    update(id: number, updateAdminDto: UpdateAdminDto): Promise<Admin>;
    remove(id: number): Promise<void>;
    findByEmail(email: string): Promise<Admin | null>;
}

export interface IPasswordService {
    hash(password: string): Promise<string>;
    compare(password: string, hash: string): Promise<boolean>;
}
