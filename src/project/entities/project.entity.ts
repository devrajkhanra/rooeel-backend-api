// src/project/entities/project.entity.ts
import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class Project {
    @Field(() => Int)
    id: number;

    @Field()
    name: string;

    @Field({ nullable: true })
    description?: string;

    @Field()
    status: string;

    // For relations, define the nested ObjectType
    // @Field(() => Admin)
    // admin: Admin;
}