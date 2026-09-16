import { IsInt, IsString, Min } from 'class-validator';

export class CreatePhaseDto {
  @IsString()
  name: string;

  @IsString()
  color: string;

  @IsInt()
  @Min(1)
  startDay: number;

  @IsInt()
  @Min(1)
  endDay: number;
}
