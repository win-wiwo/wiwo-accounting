import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class PrNumberConfig extends Document {
  @Prop({ default: '-' })
  separator: string;

  @Prop({ default: 4, min: 3, max: 8 })
  sequenceDigits: number;
}

export const PrNumberConfigSchema = SchemaFactory.createForClass(PrNumberConfig);
