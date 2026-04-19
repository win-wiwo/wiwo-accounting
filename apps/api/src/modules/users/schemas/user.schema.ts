import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { UserRole } from '@prams/shared';

@Schema({ timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } })
export class User extends Document {
  @Prop({ required: true, unique: true, trim: true })
  employeeId: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ required: true, enum: Object.values(UserRole), default: UserRole.STAFF })
  role: UserRole;

  @Prop({ type: Types.ObjectId, ref: 'Department', default: null })
  departmentId: Types.ObjectId | null;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: String, default: null })
  refreshToken: string | null;

  @Prop({ type: Date, default: null })
  lastLoginAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ role: 1 });
UserSchema.index({ departmentId: 1 });
UserSchema.index({ isActive: 1, role: 1 });

UserSchema.virtual('fullName').get(function (this: User) {
  return `${this.firstName} ${this.lastName}`;
});

UserSchema.set('toJSON', {
  transform: (_doc: unknown, ret: Record<string, unknown>) => {
    delete ret.passwordHash;
    delete ret.refreshToken;
    delete ret.__v;
    return ret;
  },
} as never);
