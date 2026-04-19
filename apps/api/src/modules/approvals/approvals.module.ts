import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApprovalsService } from './approvals.service';
import { ApprovalsController } from './approvals.controller';
import { Approval, ApprovalSchema } from './schemas/approval.schema';
import { PurchaseRequest, PurchaseRequestSchema } from '../purchase-requests/schemas/purchase-request.schema';
import { Department, DepartmentSchema } from '../departments/schemas/department.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Approval.name, schema: ApprovalSchema },
      { name: PurchaseRequest.name, schema: PurchaseRequestSchema },
      { name: Department.name, schema: DepartmentSchema },
    ]),
  ],
  controllers: [ApprovalsController],
  providers: [ApprovalsService],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
