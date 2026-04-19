import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { PurchaseRequest, PurchaseRequestSchema } from '../purchase-requests/schemas/purchase-request.schema';
import { Department, DepartmentSchema } from '../departments/schemas/department.schema';
import { Approval, ApprovalSchema } from '../approvals/schemas/approval.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PurchaseRequest.name, schema: PurchaseRequestSchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: Approval.name, schema: ApprovalSchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
