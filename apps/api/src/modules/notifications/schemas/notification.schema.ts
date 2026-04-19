import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Notification extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recipientId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  message: string;

  @Prop({
    required: true,
    enum: ['approval_approved', 'approval_rejected', 'approval_returned', 'pr_submitted', 'pr_needs_action', 'system'],
  })
  type: string;

  @Prop({ type: Types.ObjectId, ref: 'PurchaseRequest', default: null })
  purchaseRequestId: Types.ObjectId | null;

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ type: Date, default: null })
  readAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, createdAt: -1 });
// TTL: auto-delete after 90 days
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

NotificationSchema.set('toJSON', {
  transform: (_doc: unknown, ret: Record<string, unknown>) => {
    delete ret.__v;
    return ret;
  },
} as never);
