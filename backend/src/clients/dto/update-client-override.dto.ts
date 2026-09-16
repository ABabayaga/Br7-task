import { IsArray, IsString } from 'class-validator';

export class UpdateClientOverrideDto {
  @IsArray()
  @IsString({ each: true })
  disabledStageTemplateIds: string[];
}
