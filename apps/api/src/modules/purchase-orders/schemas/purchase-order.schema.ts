import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: true })
export class CanvassEntry {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Supplier', required: true })
  supplierId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  supplierName: string;

  @Prop({ type: [{ description: String, unitPrice: Number, totalPrice: Number, remarks: String }], default: [] })
  quotedItems: Array<{
    description: string;
    unitPrice: number;
    totalPrice: number;
    remarks: string;
  }>;

  @Prop({ required: true, min: 0 })
  totalQuotedAmount: number;

  @Prop({ type: String, default: null })
  remarks: string | null;

  @Prop({ default: false })
  isSelected: boolean;
}

export const CanvassEntrySchema = SchemaFactory.createForClass(CanvassEntry);

@Schema({ _id: true })
export class POLineItem {
  _id: Types.ObjectId;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, trim: true })
  unit: string;

  @Prop({ required: true, min: 0 })
  unitPrice: number;

  @Prop({ required: true, min: 0 })
  totalPrice: number;

  @Prop({ type: String, default: null })
  notes: string | null;
}

export const POLineItemSchema = SchemaFactory.createForClass(POLineItem);

@Schema({ timestamps: true })
export class PurchaseOrder extends Document {
  @Prop({ unique: true, sparse: true })
  poNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'PurchaseRequest', required: true })
  purchaseRequestId: Types.ObjectId;

  @Prop({ type: String, default: null })
  sourceRequestNumber: string | null;

  @Prop({ required: true, enum: ['purchase_request', 'job_request'] })
  sourceRequestType: string;

  @Prop({ type: Types.ObjectId, ref: 'Supplier', default: null })
  supplierId: Types.ObjectId | null;

  @Prop({ type: String, default: null, trim: true })
  projectName: string | null;

  @Prop({ type: [POLineItemSchema], default: [] })
  items: POLineItem[];

  @Prop({ default: 0 })
  totalAmount: number;

  @Prop({ default: 'PHP' })
  currency: string;

  @Prop({ type: [CanvassEntrySchema], default: [] })
  canvassEntries: CanvassEntry[];

  @Prop({ required: true, enum: ['draft', 'submitted', 'approved', 'issued', 'cancelled'], default: 'draft' })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  approvedBy: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  approvedAt: Date | null;

  @Prop({ type: Date, default: null })
  issuedAt: Date | null;

  @Prop({ type: String, default: null })
  cancellationReason: string | null;

  @Prop({ type: String, default: null })
  remarks: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export const PurchaseOrderSchema = SchemaFactory.createForClass(PurchaseOrder);

PurchaseOrderSchema.index({ purchaseRequestId: 1 });
PurchaseOrderSchema.index({ supplierId: 1 });
PurchaseOrderSchema.index({ status: 1, createdAt: -1 });
PurchaseOrderSchema.index({ createdBy: 1 });

PurchaseOrderSchema.set('toJSON', {
  transform: (_doc: unknown, ret: Record<string, unknown>) => {
    delete ret.__v;
    return ret;
  },
} as never);
