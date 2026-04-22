import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProjectStatus = 'active' | 'completed' | 'archived';

@Schema({ timestamps: true })
export class Project extends Document {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: String, default: null, trim: true, uppercase: true })
  code: string | null;

  @Prop({ type: String, default: null, trim: true })
  description: string | null;

  @Prop({ required: true, enum: ['active', 'completed', 'archived'], default: 'active' })
  status: ProjectStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);

ProjectSchema.index({ name: 'text', code: 'text' });
ProjectSchema.index({ status: 1, createdAt: -1 });

ProjectSchema.set('toJSON', {
  transform: (_doc: unknown, ret: Record<string, unknown>) => {
    delete ret.__v;
    return ret;
  },
} as never);
