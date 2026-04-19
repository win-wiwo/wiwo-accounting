import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Department extends Document {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  code: string;

  @Prop({ default: '', trim: true })
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  headId: Types.ObjectId | null;

  @Prop({ default: true })
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const DepartmentSchema = SchemaFactory.createForClass(Department);

DepartmentSchema.index({ headId: 1 });

DepartmentSchema.set('toJSON', {
  transform: (_doc: unknown, ret: Record<string, unknown>) => {
    delete ret.__v;
    return ret;
  },
} as never);
