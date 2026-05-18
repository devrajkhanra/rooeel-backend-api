import { Prisma, UserRequest } from '@prisma/client';

const userSelect = {
    select: { id: true, firstName: true, lastName: true, email: true },
} as const;

const adminSelect = {
    select: { id: true, firstName: true, lastName: true, email: true },
} as const;

/** Full payload with both relations (used by findOne) */
export type RequestWithRelations = Prisma.UserRequestGetPayload<{
    include: { user: typeof userSelect; admin: typeof adminSelect };
}>;

/** Payload with only admin relation (used by findAllByUser) */
export type RequestWithAdmin = Prisma.UserRequestGetPayload<{
    include: { admin: typeof adminSelect };
}>;

/** Payload with only user relation (used by findAllByAdmin) */
export type RequestWithUser = Prisma.UserRequestGetPayload<{
    include: { user: typeof userSelect };
}>;

export interface GeneratePasswordResult {
    message: string;
    generatedPassword: string;
    requestId: number;
    userId: number;
}

export interface IRequestService {
    createRequest(userId: number, createRequestDto: any): Promise<UserRequest>;
    forgotPassword(email: string): Promise<{ message: string }>;
    findAllByUser(userId: number): Promise<RequestWithAdmin[]>;
    findAllByAdmin(adminId: number): Promise<RequestWithUser[]>;
    findOne(id: number): Promise<RequestWithRelations | null>;
    approveRequest(id: number, adminId: number): Promise<UserRequest>;
    rejectRequest(id: number, adminId: number): Promise<UserRequest>;
    generatePassword(id: number, adminId: number): Promise<GeneratePasswordResult>;
}
