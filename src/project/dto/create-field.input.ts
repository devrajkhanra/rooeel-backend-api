import { InputType, Field, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';

@InputType()
export class CreateFieldInput {
    @Field()
    @IsString()
    @IsNotEmpty()
    name: string; // machine name e.g. "clientName"

    @Field()
    @IsString()
    @IsNotEmpty()
    label: string; // display label e.g. "Client Name"

    @Field()
    @IsString()
    @IsNotEmpty()
    fieldType: string; // 'text' | 'number' | 'date' | 'select' | 'textarea' | 'file'

    @Field({ nullable: true })
    @IsString()
    @IsOptional()
    options?: string; // JSON string for select options

    @Field({ nullable: true })
    @IsBoolean()
    @IsOptional()
    required?: boolean;

    @Field(() => Int, { nullable: true })
    @IsInt()
    @Min(0)
    @IsOptional()
    sortOrder?: number;
}

@InputType()
export class SetFieldValueInput {
    @Field(() => Int)
    @IsInt()
    fieldId: number;

    @Field()
    @IsString()
    value: string;
}
