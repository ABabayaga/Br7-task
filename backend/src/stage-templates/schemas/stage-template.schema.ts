import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { SECTORS } from '../../common/sector.js';
import type { Sector } from '../../common/sector.js';

export type StageTemplateDocument = HydratedDocument<StageTemplate>;

@Schema({ timestamps: true })
export class StageTemplate {
  @Prop({ type: Types.ObjectId, ref: 'ServiceType', required: true })
  serviceTypeId: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  order: number;

  @Prop({ required: true })
  name: string;

  @Prop({ type: String, required: true, enum: SECTORS })
  defaultSector: Sector;

  @Prop({ required: true, min: 1 })
  defaultDurationDays: number;
}

export const StageTemplateSchema = SchemaFactory.createForClass(StageTemplate);
StageTemplateSchema.index({ serviceTypeId: 1, order: 1 }, { unique: true });
