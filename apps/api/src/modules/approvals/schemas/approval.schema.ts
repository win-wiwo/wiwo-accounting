import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApprovalAction } from '@prams/shared';

@Schema({ timestamps: true })
export class Approval extends Document {
  @Prop({ type: Types.ObjectId, ref: 'PurchaseRequest', required: true })
  purchaseRequestId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  approverId: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 3 })
  approvalLevel: number;

  @Prop({ required: true, enum: Object.values(ApprovalAction) })
  action: ApprovalAction;

  @Prop({ default: '', trim: true })
  comments: string;

  @Prop({ type: String, default: null, trim: true })
  conditions: string | null;

  @Prop({ required: true })
  actionDate: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const ApprovalSchema = SchemaFactory.createForClass(Approval);

ApprovalSchema.index({ purchaseRequestId: 1, actionDate: 1 });
ApprovalSchema.index({ approverId: 1, actionDate: -1 });
ApprovalSchema.index({ purchaseRequestId: 1, approvalLevel: 1 });

ApprovalSchema.set('toJSON', {
  transform: (_doc: unknown, ret: Record<string, unknown>) => {
    delete ret.__v;
    return ret;
  },
} as never);
