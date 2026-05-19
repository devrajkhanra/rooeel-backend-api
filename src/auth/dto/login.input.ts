import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class LoginInput {
    @Field()
    @IsEmail()
    email: string;

    @Field()
    @IsString()
    @IsNotEmpty()
    password: string;

    @Field({ nullable: true, description: "Defaults to 'user' if not provided" })
    @IsString()
    role?: string = 'user';
}