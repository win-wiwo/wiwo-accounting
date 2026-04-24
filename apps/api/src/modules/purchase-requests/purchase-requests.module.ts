import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PurchaseRequestsService } from './purchase-requests.service';
import { PurchaseRequestsController } from './purchase-requests.controller';
import { PurchaseRequest, PurchaseRequestSchema } from './schemas/purchase-request.schema';
import { PrNumberingModule } from '../pr-numbering/pr-numbering.module';
import { DepartmentsModule } from '../departments/departments.module';
import { Supplier, SupplierSchema } from '../suppliers/schemas/supplier.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PurchaseRequest.name, schema: PurchaseRequestSchema },
      { name: Supplier.name, schema: SupplierSchema },
    ]),
    PrNumberingModule,
    DepartmentsModule,
  ],
  controllers: [PurchaseRequestsController],
  providers: [PurchaseRequestsService],
  exports: [PurchaseRequestsService],
})
export class PurchaseRequestsModule {}
