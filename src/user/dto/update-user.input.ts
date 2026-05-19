import { InputType, Field, PartialType, OmitType } from '@nestjs/graphql';
import { CreateUserInput } from './create-user.input';
import { IsOptional, IsString, MinLength } from 'class-validator';

@InputType()
export class UpdateUserInput extends PartialType(
    OmitType(CreateUserInput, ['password'] as const),
) {
    @Field({ nullable: true })
    @IsOptional()
    @IsString()
    @MinLength(8)
    password?: string;
}