import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PurchaseRequestsService } from './purchase-requests.service';
import { PurchaseRequestsController } from './purchase-requests.controller';
import { PurchaseRequest, PurchaseRequestSchema } from './schemas/purchase-request.schema';
import { PrNumberingModule } from '../pr-numbering/pr-numbering.module';
import { DepartmentsModule } from '../departments/departments.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PurchaseRequest.name, schema: PurchaseRequestSchema },
    ]),
    PrNumberingModule,
    DepartmentsModule,
  ],
  controllers: [PurchaseRequestsController],
  providers: [PurchaseRequestsService],
  exports: [PurchaseRequestsService],
})
export class PurchaseRequestsModule {}
