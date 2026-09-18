import { IsDateString, IsMongoId, IsOptional, IsString } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsMongoId()
  clientId: string;

  @IsOptional()
  @IsMongoId()
  serviceTypeId?: string;

  @IsDateString()
  startDate: string;
}
