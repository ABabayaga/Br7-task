import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ServiceTypeDocument = HydratedDocument<ServiceType>;

@Schema({ timestamps: true })
export class ServiceType {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ type: Boolean, required: true, default: true })
  active: boolean;
}

export const ServiceTypeSchema = SchemaFactory.createForClass(ServiceType);
