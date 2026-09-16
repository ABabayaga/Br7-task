import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { SECTORS, Sector } from '../../common/sector.js';

export class UpdateStageTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(SECTORS)
  defaultSector?: Sector;

  @IsOptional()
  @IsInt()
  @Min(1)
  defaultDurationDays?: number;
}
