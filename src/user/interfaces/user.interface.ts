// user.interface.ts
import { User } from '@prisma/client';
import { CreateUserInput } from '../dto/create-user.input';
import { UpdateUserInput } from '../dto/update-user.input';


export interface IUserService {
    create(createUserDto: CreateUserInput, adminId: number): Promise<User>;
    findAll(): Promise<User[]>;
    findOne(id: number): Promise<User | null>;
    update(id: number, updateUserDto: UpdateUserInput): Promise<User>;
    remove(id: number): Promise<User>;
    findByEmail(email: string): Promise<User | null>;
}
