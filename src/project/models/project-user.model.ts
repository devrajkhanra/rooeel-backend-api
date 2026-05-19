import { ObjectType, Field, Int } from '@nestjs/graphql';
import { User } from '../../user/models/user.model';
import { ProjectRole } from './project-role.model';
import { Department } from './department.model';

@ObjectType()
export class ProjectUser {
    @Field(() => Int)
    id: number;

    @Field(() => Int)
    projectId: number;

    @Field(() => Int)
    userId: number;

    @Field(() => User)
    user: User;

    @Field(() => ProjectRole, { nullable: true })
    projectRole?: ProjectRole;

    @Field(() => Department, { nullable: true })
    department?: Department;

    @Field()
    assignedAt: Date;
}