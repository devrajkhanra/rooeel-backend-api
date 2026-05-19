import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class Admin {
    @Field(() => ID)
    id: number;

    @Field()
    firstName: string;

    @Field()
    lastName: string;

    @Field()
    email: string;

    // Password omitted to prevent leaking credentials into the graph

    @Field()
    createdAt: Date;

    @Field()
    updatedAt: Date;
}