import { PartialType } from '@nestjs/mapped-types';
import { CreateProjectDto } from './create-project.input';

// PartialType automatically makes all fields from CreateProjectDto optional for updates
export class UpdateProjectDto extends PartialType(CreateProjectDto) { }