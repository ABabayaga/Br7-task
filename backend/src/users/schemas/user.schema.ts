import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { SECTORS, Sector } from '../../common/sector.js';

export type UserRole = 'admin' | 'member';
export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ type: String, required: true, enum: ['admin', 'member'], default: 'member' })
  role: UserRole;

  @Prop({ type: String, enum: SECTORS })
  setor?: Sector;
}

export const UserSchema = SchemaFactory.createForClass(User);
