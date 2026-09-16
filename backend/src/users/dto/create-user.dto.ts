import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import type { UserRole } from '../schemas/user.schema.js';
import { SECTORS } from '../../common/sector.js';
import type { Sector } from '../../common/sector.js';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsIn(['admin', 'member'])
  role?: UserRole;

  @IsOptional()
  @IsIn(SECTORS)
  setor?: Sector;
}
