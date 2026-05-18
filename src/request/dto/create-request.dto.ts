import { IsString, IsIn, IsOptional, MinLength } from 'class-validator';

export class CreateRequestDto {
    @IsString()
    @IsIn(['firstName', 'lastName', 'email', 'password', 'password_reset'])
    requestType: 'firstName' | 'lastName' | 'email' | 'password' | 'password_reset';

    @IsOptional()
    @IsString()
    @MinLength(1)
    requestedValue?: string; // Not required for password/password_reset types

    @IsOptional()
    @IsString()
    @MinLength(6)
    currentPassword?: string; // Required only for authenticated password change
}
