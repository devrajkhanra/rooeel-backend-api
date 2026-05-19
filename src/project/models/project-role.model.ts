import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class ProjectRole {
    @Field(() => Int)
    id: number;

    @Field(() => Int)
    projectId: number;

    @Field()
    name: string;

    @Field()
    createdAt: Date;
}
