import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { SECTORS } from '../../common/sector.js';
import type { Sector } from '../../common/sector.js';

export class CreateStageTemplateDto {
  @IsString()
  name: string;

  @IsIn(SECTORS)
  defaultSector: Sector;

  @IsInt()
  @Min(1)
  defaultDurationDays: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsString()
  phaseId?: string;
}
