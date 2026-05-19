import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class ProjectFieldValue {
    @Field(() => Int)
    id: number;

    @Field({ nullable: true })
    value?: string;
}

@ObjectType()
export class ProjectField {
    @Field(() => Int)
    id: number;

    @Field(() => Int)
    projectId: number;

    @Field()
    name: string;

    @Field()
    label: string;

    @Field()
    fieldType: string;

    @Field({ nullable: true })
    options?: string; // JSON string of options for 'select' type

    @Field()
    required: boolean;

    @Field(() => Int)
    sortOrder: number;

    @Field(() => ProjectFieldValue, { nullable: true })
    value?: ProjectFieldValue;
}
