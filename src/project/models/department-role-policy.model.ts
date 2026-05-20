import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class DepartmentRolePolicy {
  @Field(() => Int)
  id: number;

  @Field(() => Int)
  departmentRoleId: number;

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
