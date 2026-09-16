import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { SECTORS } from '../../common/sector.js';
import type { Sector } from '../../common/sector.js';

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskDocument = HydratedDocument<Task>;

@Schema({ timestamps: true })
export class Task {
  @Prop({ required: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true })
  projectId: Types.ObjectId;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ required: true, min: 0, max: 100, default: 0 })
  progress: number;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assigneeId?: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Task' }], default: [] })
  dependencies: Types.ObjectId[];

  @Prop({ type: String, required: true, enum: ['todo', 'in_progress', 'done'], default: 'todo' })
  status: TaskStatus;

  @Prop({ type: String, enum: SECTORS })
  setor?: Sector;

  @Prop({ type: Types.ObjectId, ref: 'StageTemplate' })
  sourceStageTemplateId?: Types.ObjectId;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
