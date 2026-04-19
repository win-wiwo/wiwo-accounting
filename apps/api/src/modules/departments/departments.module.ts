import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DepartmentsService } from './departments.service';
import { DepartmentsController } from './departments.controller';
import { Department, DepartmentSchema } from './schemas/department.schema';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Department.name, schema: DepartmentSchema }]),
    UsersModule,
  ],
  controllers: [DepartmentsController],
  providers: [DepartmentsService],
  exports: [DepartmentsService],
})
export class DepartmentsModule {}
