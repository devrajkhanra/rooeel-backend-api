import { IsString, IsNotEmpty, IsEmail, IsIn } from 'class-validator';

export class LoginDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    password: string;

    @IsString()
    @IsNotEmpty()
    @IsIn(['admin', 'user'])
    role: string;
}
