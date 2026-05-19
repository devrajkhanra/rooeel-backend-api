import { ObjectType, Field, Int } from '@nestjs/graphql';
import { User } from '../../user/models/user.model';

@ObjectType()
export class SubTask {
    @Field(() => Int)
    id: number;

    @Field(() => Int)
    taskId: number;

    @Field()
    title: string;

    @Field({ nullable: true })
    description?: string;

    @Field()
    status: string;

    @Field()
    type: string;

    @Field({ nullable: true })
    formSchema?: string;

    @Field({ nullable: true })
    submissionData?: string;

    @Field(() => User, { nullable: true })
    assignee?: User;

    @Field()
    createdAt: Date;

    @Field()
    updatedAt: Date;
}
