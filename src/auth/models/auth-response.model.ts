import { ObjectType, Field, Int } from '@nestjs/graphql';
import { User } from '../../user/models/user.model';
import { Admin } from '../../admin/models/admin.model';

@ObjectType()
export class AuthResponse {
    @Field()
    access_token: string;

    @Field(() => Int)
    expiresIn: number;

    // We use nullable fields so this response works for both Users and Admins
    @Field(() => Admin, { nullable: true })
    admin?: Admin;

    @Field(() => User, { nullable: true })
    user?: User;
}