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

    if (ret.headId && typeof ret.headId === 'object' && !Array.isArray(ret.headId)) {
      const h = ret.headId as { _id: unknown; firstName: unknown; lastName: unknown; email: unknown; employeeId: unknown };
      ret.head = { _id: h._id, firstName: h.firstName, lastName: h.lastName, email: h.email, employeeId: h.employeeId };
      ret.headId = h._id;
    }

    return ret;
  },
} as never);
