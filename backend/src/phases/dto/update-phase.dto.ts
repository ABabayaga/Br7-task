import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdatePhaseDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  startDay?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  endDay?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
