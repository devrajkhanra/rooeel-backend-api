import { ObjectType, Field, Int } from '@nestjs/graphql';
import { User } from '../../user/models/user.model';
import { SubTask } from './subtask.model';
import { Department } from './department.model';

@ObjectType()
export class Task {
    @Field(() => Int)
    id: number;

    @Field(() => Int)
    projectId: number;

    @Field(() => Int, { nullable: true })
    departmentId?: number;

    @Field()
    title: string;

    @Field({ nullable: true })
    description?: string;

    @Field()
    status: string;

    @Field()
    type: string; // 'basic' | 'form'

    @Field({ nullable: true })
    formSchema?: string;

    @Field({ nullable: true })
    submissionData?: string;

    @Field(() => User, { nullable: true })
    assignee?: User;

    @Field(() => Department, { nullable: true })
    department?: Department;

    @Field(() => [SubTask], { nullable: true })
    subtasks?: SubTask[];

    @Field()
    createdAt: Date;

    @Field()
    updatedAt: Date;
}