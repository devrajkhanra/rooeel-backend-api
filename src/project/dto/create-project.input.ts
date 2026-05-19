import { IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateProjectInput {
    @IsNotEmpty()
    @IsString()
    @Field()
    name: string;

    @IsOptional()
    @IsString()
    @Field(() => String, { nullable: true })
    description?: string;

    @IsOptional()
    @IsIn(['active', 'inactive', 'completed', 'planning', 'on-hold', 'cancelled', 'on-review', 'pending', 'rejected'])
    @Field(() => String, { nullable: true })
    status?: string;

    @IsOptional()
    @IsString()
    @Field(() => String, { nullable: true })
    image?: string;
}