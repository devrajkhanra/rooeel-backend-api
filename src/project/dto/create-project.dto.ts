import { IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';

export class CreateProjectDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsIn(['active', 'inactive', 'completed', 'planning', 'on-hold', 'cancelled', 'on-review', 'pending', 'rejected'])
    status?: string;
}