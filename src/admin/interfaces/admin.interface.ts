import { CreateAdminInput } from '../dto/create-admin.input';
import { UpdateAdminInput } from '../dto/update-admin.input';
import { Admin } from '@prisma/client';

export interface IAdminService {
    create(createAdminInput: CreateAdminInput): Promise<Admin>;
    findAll(): Promise<Admin[]>;
    findOne(id: number): Promise<Admin | null>;
    update(id: number, updateAdminInput: UpdateAdminInput): Promise<Admin>;
    remove(id: number): Promise<void>;
    findByEmail(email: string): Promise<Admin | null>;
}

export interface IPasswordService {
    hash(password: string): Promise<string>;
    compare(password: string, hash: string): Promise<boolean>;
}
