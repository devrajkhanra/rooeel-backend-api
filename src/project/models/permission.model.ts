import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class Permission {
    @Field(() => Int)
    id: number;

    @Field(() => Int)
    projectRoleId: number;

    @Field(() => Int, { nullable: true })
    departmentId?: number;

    @Field()
    resource: string; // 'WORK_ORDER' | 'TASK' | 'SUBTASK' | 'DEPARTMENT' | 'USER'

    @Field()
    canView: boolean;

    @Field()
    canCreate: boolean;

    @Field()
    canEdit: boolean;

    @Field()
    canDelete: boolean;
}
