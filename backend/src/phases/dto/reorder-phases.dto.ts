import { IsArray, IsString } from 'class-validator';

export class ReorderPhasesDto {
  @IsArray()
  @IsString({ each: true })
  orderedIds: string[];
}
