import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
export class User {
    @Field(() => ID)
    id: number;

    @Field()
    firstName: string;

    @Field()
    lastName: string;

    @Field()
    email: string;

    // We intentionally omit the 'password' field so it never leaks in the graph

    @Field(() => Int, { nullable: true })
    createdBy?: number;

    @Field()
    createdAt: Date;

    @Field()
    updatedAt: Date;
}