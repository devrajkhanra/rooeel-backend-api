import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class LogoutResponse {
    @Field()
    message: string;
}