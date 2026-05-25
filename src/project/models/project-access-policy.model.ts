import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ProjectAccessPolicy {
    @Field()
    resource: string;

    @Field()
    canView: boolean;

    @Field()
    canCreate: boolean;

    @Field()
    canEdit: boolean;

    @Field()
    canDelete: boolean;
}

