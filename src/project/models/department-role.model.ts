import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class DepartmentRole {
  @Field(() => Int)
  id: number;

  @Field(() => Int)
  departmentId: number;

  @Field()
  name: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
