import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrder, PurchaseOrderSchema } from './schemas/purchase-order.schema';
import { PurchaseRequest, PurchaseRequestSchema } from '../purchase-requests/schemas/purchase-request.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: PurchaseRequest.name, schema: PurchaseRequestSchema },
    ]),
  ],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService],
  exports: [PurchaseOrdersService],
})
export class PurchaseOrdersModule {}
