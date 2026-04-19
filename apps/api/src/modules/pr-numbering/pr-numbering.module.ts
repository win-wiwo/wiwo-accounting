import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PrNumberingService } from './pr-numbering.service';
import { PrNumberingController } from './pr-numbering.controller';
import { PrSequence, PrSequenceSchema } from './schemas/pr-sequence.schema';
import { PrNumberConfig, PrNumberConfigSchema } from './schemas/pr-number-config.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PrSequence.name, schema: PrSequenceSchema },
      { name: PrNumberConfig.name, schema: PrNumberConfigSchema },
    ]),
  ],
  controllers: [PrNumberingController],
  providers: [PrNumberingService],
  exports: [PrNumberingService],
})
export class PrNumberingModule {}
