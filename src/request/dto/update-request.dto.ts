import { IsString, IsIn, IsOptional } from 'class-validator';

export class UpdateRequestDto {
    @IsOptional()
    @IsString()
    @IsIn(['pending', 'approved', 'rejected'])
    status?: 'pending' | 'approved' | 'rejected';
}
