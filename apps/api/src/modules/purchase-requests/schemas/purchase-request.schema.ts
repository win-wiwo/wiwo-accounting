import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PrStatus, PrPriority } from '@prams/shared';

@Schema({ _id: true })
export class LineItem {
  _id: Types.ObjectId;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, trim: true })
  unit: string;

  @Prop({ required: true, min: 0 })
  estimatedPrice: number;

  @Prop({ required: true, min: 0 })
  totalPrice: number;

  @Prop({ type: String, default: null })
  notes: string | null;
}

export const LineItemSchema = SchemaFactory.createForClass(LineItem);

@Schema({ _id: true })
export class Attachment {
  _id: Types.ObjectId;

  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true })
  storagePath: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ type: String, default: 'other' })
  category: string;

  @Prop({ required: true })
  size: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  uploadedBy: Types.ObjectId;

  @Prop({ default: () => new Date() })
  uploadedAt: Date;
}

export const AttachmentSchema = SchemaFactory.createForClass(Attachment);

@Schema({ timestamps: true })
export class PurchaseRequest extends Document {
  @Prop({ unique: true, sparse: true })
  prNumber: string;

  @Prop({ required: true, enum: ['purchase_request', 'job_request'], default: 'purchase_request' })
  requestType: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ type: String, default: null, trim: true })
  projectName: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  requesterId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Department', required: true })
  departmentId: Types.ObjectId;

  @Prop({ required: true, enum: Object.values(PrStatus), default: PrStatus.DRAFT })
  status: PrStatus;

  @Prop({ required: true, enum: Object.values(PrPriority), default: PrPriority.MEDIUM })
  priority: PrPriority;

  @Prop({ type: [LineItemSchema], default: [] })
  items: LineItem[];

  @Prop({ default: 0 })
  totalAmount: number;

  @Prop({ default: 'PHP' })
  currency: string;

  @Prop({ required: true, trim: true })
  justification: string;

  @Prop({ type: Date, default: null })
  neededByDate: Date | null;

  @Prop({ type: [AttachmentSchema], default: [] })
  attachments: Attachment[];

  @Prop({ default: 0 })
  currentApprovalLevel: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Approval' }], default: [] })
  approvalHistory: Types.ObjectId[];

  @Prop({ type: Date, default: null })
  submittedAt: Date | null;

  @Prop({ type: Date, default: null })
  completedAt: Date | null;

  @Prop({ type: String, default: null })
  cancellationReason: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export const PurchaseRequestSchema = SchemaFactory.createForClass(PurchaseRequest);

PurchaseRequestSchema.index({ prNumber: 1 }, { unique: true, sparse: true });
PurchaseRequestSchema.index({ requesterId: 1, status: 1 });
PurchaseRequestSchema.index({ departmentId: 1, status: 1 });
PurchaseRequestSchema.index({ status: 1, createdAt: -1 });
PurchaseRequestSchema.index({ currentApprovalLevel: 1, status: 1 });
PurchaseRequestSchema.index({ createdAt: -1 });
PurchaseRequestSchema.index(
  { title: 'text', description: 'text', prNumber: 'text', projectName: 'text', requestType: 'text' },
  { name: 'pr_text_search' },
);
PurchaseRequestSchema.index({ requestType: 1, status: 1, createdAt: -1 });

PurchaseRequestSchema.set('toJSON', {
  transform: (_doc: unknown, ret: Record<string, unknown>) => {
    delete ret.__v;
    return ret;
  },
} as never);
