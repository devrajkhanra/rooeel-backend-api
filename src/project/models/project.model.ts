import { ObjectType, Field, Int } from '@nestjs/graphql';
import { ProjectField } from './project-field.model';
import { ProjectUser } from './project-user.model';
import { WorkOrderPdf } from './work-order-pdf.model';
import { Department } from './department.model';
import { ProjectRole } from './project-role.model';
import { Admin } from '../../admin/models/admin.model';
import { Task } from './task.model';
import { ProjectAccessPolicy } from './project-access-policy.model';

@ObjectType()
export class Project {
    @Field(() => Int)
    id: number;

    @Field()
    name: string;

    @Field({ nullable: true })
    description?: string;

    @Field({ nullable: true })
    image?: string;

    @Field()
    status: string;

    @Field()
    createdAt: Date;

    @Field()
    updatedAt: Date;

    @Field(() => Admin, { nullable: true })
    admin?: Admin;

    @Field(() => [ProjectField], { nullable: true })
    fields?: ProjectField[];

    @Field(() => [ProjectUser], { nullable: true })
    users?: ProjectUser[];

    @Field(() => [WorkOrderPdf], { nullable: true })
    workOrders?: WorkOrderPdf[];

    @Field(() => [Department], { nullable: true })
    departments?: Department[];

    @Field(() => [ProjectRole], { nullable: true })
    roles?: ProjectRole[];

    @Field(() => [Task], { nullable: true })
    tasks?: Task[];

    @Field(() => [ProjectAccessPolicy], { nullable: true })
    effectiveAccessPolicies?: ProjectAccessPolicy[];
}
