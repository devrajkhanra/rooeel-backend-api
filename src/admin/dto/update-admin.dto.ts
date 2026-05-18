import { IsEmail, IsNotEmpty, MinLength, IsOptional } from 'class-validator';

export class UpdateAdminDto {
    @IsOptional()
    @IsNotEmpty()
    @MinLength(3)
    firstName?: string;

    @IsOptional()
    @IsNotEmpty()
    @MinLength(3)
    lastName?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsNotEmpty()
    @MinLength(6)
    password?: string;
}
