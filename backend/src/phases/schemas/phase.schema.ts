import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PhaseDocument = HydratedDocument<Phase>;

@Schema({ timestamps: true })
export class Phase {
  @Prop({ type: Types.ObjectId, ref: 'ServiceType', required: true })
  serviceTypeId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  color: string;

  @Prop({ required: true, min: 0 })
  order: number;

  @Prop({ required: true, min: 1 })
  startDay: number;

  @Prop({ required: true, min: 1 })
  endDay: number;

  @Prop({ type: Boolean, required: true, default: true })
  active: boolean;
}

export const PhaseSchema = SchemaFactory.createForClass(Phase);
PhaseSchema.index({ serviceTypeId: 1, order: 1 }, { unique: true });
