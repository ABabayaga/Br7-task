import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  clientId: string;

  @IsString()
  serviceTypeId: string;

  @IsDateString()
  startDate: string;
}
