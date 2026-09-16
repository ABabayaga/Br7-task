import { IsString } from 'class-validator';

export class CreateServiceTypeDto {
  @IsString()
  name: string;
}
