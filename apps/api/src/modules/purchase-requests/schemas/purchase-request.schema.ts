import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PrStatus, PrPriority, SourcingType } from '@prams/shared';

@Schema({ _id: true })
export class SellerReference {
  _id: Types.ObjectId;

  @Prop({ required: true, trim: true })
  sellerName: string;

  @Prop({ type: String, default: null })
  url: string | null;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ type: String, default: null })
  notes: string | null;
}

export const SellerReferenceSchema = SchemaFactory.createForClass(SellerReference);

@Schema({ _id: true })
export class LineItem {
  _id: Types.ObjectId;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, trim: true })
  unit: string;

  @Prop({ type: String, default: null, trim: true })
  specifications: string | null;

  @Prop({ required: true, enum: Object.values(SourcingType), default: SourcingType.PROCUREMENT })
  sourcingType: string;

  @Prop({ required: true, min: 0, default: 0 })
  estimatedPrice: number;

  @Prop({ required: true, min: 0, default: 0 })
  totalPrice: number;

  @Prop({ type: String, default: null })
  notes: string | null;

  // Online sourcing — up to 3 seller references
  @Prop({ type: [SellerReferenceSchema], default: [] })
  sellerReferences: SellerReference[];

  @Prop({ type: String, default: null })
  sellerReferencesJustification: string | null;

  // Optional photo reference from requester to help Procurement source the right item
  @Prop({ type: String, default: null })
  referencePhotoPath: string | null;

  @Prop({ type: String, default: null })
  referencePhotoOriginalName: string | null;

  // Filled by Procurement team
  @Prop({ type: Number, default: null })
  quotedUnitPrice: number | null;

  @Prop({ type: Types.ObjectId, ref: 'Supplier', default: null })
  selectedSupplierId: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  quotedAt: Date | null;
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

@Schema({ _id: true })
export class CanvassQuotedItem {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  itemId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ required: true, min: 0 })
  unitPrice: number;

  @Prop({ required: true, min: 0 })
  totalPrice: number;

  @Prop({ type: String, default: null })
  remarks: string | null;
}

export const CanvassQuotedItemSchema = SchemaFactory.createForClass(CanvassQuotedItem);

@Schema({ _id: true })
export class CanvassEntry {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Supplier', required: true })
  supplierId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  supplierName: string;

  @Prop({ type: [CanvassQuotedItemSchema], default: [] })
  quotedItems: CanvassQuotedItem[];

  @Prop({ required: true, min: 0 })
  totalQuotedAmount: number;

  @Prop({ type: String, default: null })
  remarks: string | null;

  @Prop({ default: false })
  isSelected: boolean;
}

export const CanvassEntrySchema = SchemaFactory.createForClass(CanvassEntry);

@Schema({ _id: true })
export class QuotationReturn {
  _id: Types.ObjectId;

  @Prop({ required: true, trim: true })
  note: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  returnedBy: Types.ObjectId;

  @Prop({ required: true, default: () => new Date() })
  returnedAt: Date;
}

export const QuotationReturnSchema = SchemaFactory.createForClass(QuotationReturn);

@Schema({ _id: true })
export class RecallEvent {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recalledBy: Types.ObjectId;

  @Prop({ required: true, default: () => new Date() })
  recalledAt: Date;
}

export const RecallEventSchema = SchemaFactory.createForClass(RecallEvent);

@Schema({ timestamps: true })
export class PurchaseRequest extends Document {
  @Prop({ unique: true, sparse: true })
  prNumber: string;

  @Prop({ required: true, enum: ['purchase_request', 'job_request'], default: 'purchase_request' })
  requestType: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ type: String, default: '', trim: true })
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'Project', default: null })
  projectId: Types.ObjectId | null;

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

  // Set by Procurement when returning for more info
  @Prop({ type: String, default: null })
  quotationNote: string | null;

  @Prop({ type: [CanvassEntrySchema], default: [] })
  canvassEntries: CanvassEntry[];

  @Prop({ type: String, default: null })
  canvassJustification: string | null;

  // Persistent history of all procurement returns
  @Prop({ type: [QuotationReturnSchema], default: [] })
  quotationReturnHistory: QuotationReturn[];

  // Persistent history of all requester recalls
  @Prop({ type: [RecallEventSchema], default: [] })
  recallHistory: RecallEvent[];

  // Snapshot of PR state at the time it was returned by an approver,
  // used to generate a diff view when the requester resubmits.
  @Prop({ type: Object, default: null })
  previousSubmissionSnapshot: {
    title: string;
    priority: string;
    justification: string;
    items: Array<{
      _id: string;
      description: string;
      quantity: number;
      unit: string;
      sourcingType: string;
      estimatedPrice: number;
    }>;
  } | null;

  // Free-text note from the requester explaining what changed on resubmission
  @Prop({ type: String, default: null })
  resubmissionNote: string | null;

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
