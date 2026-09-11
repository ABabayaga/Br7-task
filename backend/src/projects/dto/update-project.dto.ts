import { IsIn, IsOptional, IsString } from 'class-validator';
import type { ProjectStatus } from '../schemas/project.schema.js';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['active', 'archived'])
  status?: ProjectStatus;
}
