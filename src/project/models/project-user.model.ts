import { ObjectType, Field, Int } from '@nestjs/graphql';
import { User } from '../../user/models/user.model';
import { ProjectRole } from './project-role.model';
import { Department } from './department.model';
import { DepartmentRole } from './department-role.model';

@ObjectType()
export class ProjectUser {
    @Field(() => Int)
    id: number;

    @Field(() => Int)
    projectId: number;

    @Field(() => Int)
    userId: number;

    @Field(() => Int, { nullable: true })
    projectRoleId?: number | null;

    @Field(() => Int, { nullable: true })
    departmentId?: number | null;

    @Field(() => Int, { nullable: true })
    departmentRoleId?: number | null;

    @Field(() => User)
    user: User;

    @Field(() => ProjectRole, { nullable: true })
    projectRole?: ProjectRole;

    @Field(() => Department, { nullable: true })
    department?: Department;

    @Field(() => DepartmentRole, { nullable: true })
    departmentRole?: DepartmentRole;

    @Field()
    assignedAt: Date;
}
