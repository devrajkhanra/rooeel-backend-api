import { InputType, Field, PartialType, OmitType } from '@nestjs/graphql';
import { CreateAdminInput } from './create-admin.input';
import { IsOptional, IsString, MinLength } from 'class-validator';

@InputType()
export class UpdateAdminInput extends PartialType(
    OmitType(CreateAdminInput, ['password'] as const),
) {
    @Field({ nullable: true })
    @IsOptional()
    @IsString()
    @MinLength(8)
    password?: string;
}