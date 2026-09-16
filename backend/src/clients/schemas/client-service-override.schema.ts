import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ClientServiceOverrideDocument = HydratedDocument<ClientServiceOverride>;

@Schema({ timestamps: true })
export class ClientServiceOverride {
  @Prop({ type: Types.ObjectId, ref: 'Client', required: true })
  clientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ServiceType', required: true })
  serviceTypeId: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'StageTemplate' }], default: [] })
  disabledStageTemplateIds: Types.ObjectId[];
}

export const ClientServiceOverrideSchema = SchemaFactory.createForClass(ClientServiceOverride);
ClientServiceOverrideSchema.index({ clientId: 1, serviceTypeId: 1 }, { unique: true });
