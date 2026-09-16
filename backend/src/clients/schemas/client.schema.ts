import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ClientDocument = HydratedDocument<Client>;

@Schema({ timestamps: true })
export class Client {
  @Prop({ required: true })
  name: string;

  @Prop({ type: Boolean, required: true, default: true })
  active: boolean;
}

export const ClientSchema = SchemaFactory.createForClass(Client);
