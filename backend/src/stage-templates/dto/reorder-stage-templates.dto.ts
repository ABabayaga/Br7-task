import { IsArray, IsString } from 'class-validator';

export class ReorderStageTemplatesDto {
  @IsArray()
  @IsString({ each: true })
  orderedIds: string[];
}
