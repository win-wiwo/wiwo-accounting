import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class PrSequence extends Document {
  @Prop({ required: true, unique: true })
  year: number;

  @Prop({ default: 0 })
  lastNumber: number;
}

export const PrSequenceSchema = SchemaFactory.createForClass(PrSequence);
