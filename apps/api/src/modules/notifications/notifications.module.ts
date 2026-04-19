import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { PurchaseRequest, PurchaseRequestSchema } from '../purchase-requests/schemas/purchase-request.schema';
import { Department, DepartmentSchema } from '../departments/schemas/department.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: PurchaseRequest.name, schema: PurchaseRequestSchema },
      { name: Department.name, schema: DepartmentSchema },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
