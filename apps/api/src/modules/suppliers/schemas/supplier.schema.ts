import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Supplier extends Document {
  @Prop({ required: true, trim: true })
  companyName: string;

  @Prop({ required: true, trim: true })
  address: string;

  @Prop({ required: true, enum: ['vat', 'non_vat'] })
  taxType: string;

  @Prop({ required: true, trim: true })
  tin: string;

  @Prop({ type: String, default: null, trim: true })
  contactPerson: string | null;

  @Prop({ type: String, default: null, trim: true })
  contactNumber: string | null;

  @Prop({ type: String, default: null, trim: true })
  email: string | null;

  @Prop({ type: String, default: null, trim: true })
  paymentTerms: string | null;

  @Prop({ type: String, default: null, trim: true })
  bankAccountName: string | null;

  @Prop({ type: String, default: null, trim: true })
  bankAccountNumber: string | null;

  @Prop({ type: String, default: null, trim: true })
  bankName: string | null;

  @Prop({ required: true, enum: ['active', 'inactive', 'blacklisted'], default: 'active' })
  status: string;

  @Prop({ type: String, default: null, trim: true })
  category: string | null;

  @Prop({ type: String, default: null })
  notes: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export const SupplierSchema = SchemaFactory.createForClass(Supplier);

SupplierSchema.index({ companyName: 'text', tin: 'text' }, { name: 'supplier_text_search' });
SupplierSchema.index({ status: 1 });
SupplierSchema.index({ tin: 1 }, { unique: true });

SupplierSchema.set('toJSON', {
  transform: (_doc: unknown, ret: Record<string, unknown>) => {
    delete ret.__v;
    return ret;
  },
} as never);
