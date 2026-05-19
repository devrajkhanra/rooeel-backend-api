import { SetMetadata } from '@nestjs/common';

export interface PermissionMetadata {
    resource: string; // 'WORK_ORDER' | 'TASK' | 'SUBTASK' | 'DEPARTMENT' | 'USER'
    action: 'view' | 'create' | 'edit' | 'delete';
}

export const PERMISSION_CHECK_KEY = 'permission_check';

export const CheckPermission = (resource: string, action: 'view' | 'create' | 'edit' | 'delete') =>
    SetMetadata(PERMISSION_CHECK_KEY, { resource, action } as PermissionMetadata);
