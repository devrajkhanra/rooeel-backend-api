import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class SignupDto {
    @IsNotEmpty()
    @MinLength(3)
    firstName: string;

    @IsNotEmpty()
    @MinLength(3)
    lastName: string;

    @IsEmail()
    email: string;

    @IsNotEmpty()
    @MinLength(6)
    password: string;
}
