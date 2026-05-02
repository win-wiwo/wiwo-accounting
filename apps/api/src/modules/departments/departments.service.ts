import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { UserRole } from '@prams/shared';
import { Department } from './schemas/department.schema';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectModel(Department.name) private departmentModel: Model<Department>,
    private usersService: UsersService,
  ) {}

  async create(dto: CreateDepartmentDto): Promise<Department> {
    const existingName = await this.departmentModel.findOne({ name: dto.name });
    if (existingName) {
      throw new ConflictException('Department name already exists');
    }

    const existingCode = await this.departmentModel.findOne({ code: dto.code.toUpperCase() });
    if (existingCode) {
      throw new ConflictException('Department code already exists');
    }

    const department = new this.departmentModel({
      ...dto,
      code: dto.code.toUpperCase(),
    });

    return department.save();
  }

  async findAll(query: { page?: number; limit?: number; search?: string }) {
    const { page = 1, limit = 10, search } = query;

    const filter: FilterQuery<Department> = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [departments, total] = await Promise.all([
      this.departmentModel
        .find(filter)
        .populate('headId', 'firstName lastName email employeeId photoUrl')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.departmentModel.countDocuments(filter),
    ]);

    return {
      data: departments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<Department> {
    const department = await this.departmentModel
      .findById(id)
      .populate('headId', 'firstName lastName email employeeId photoUrl')
      .exec();

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return department;
  }

  async update(id: string, dto: UpdateDepartmentDto): Promise<Department> {
    if (dto.name) {
      const existing = await this.departmentModel.findOne({ name: dto.name, _id: { $ne: id } });
      if (existing) {
        throw new ConflictException('Department name already exists');
      }
    }

    if (dto.code) {
      const existing = await this.departmentModel.findOne({
        code: dto.code.toUpperCase(),
        _id: { $ne: id },
      });
      if (existing) {
        throw new ConflictException('Department code already exists');
      }
      dto.code = dto.code.toUpperCase();
    }

    const department = await this.departmentModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .populate('headId', 'firstName lastName email employeeId photoUrl')
      .exec();

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return department;
  }

  async addMember(departmentId: string, userId: string): Promise<void> {
    const department = await this.departmentModel.findById(departmentId);
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.usersService.update(userId, { departmentId });
  }

  async removeMember(departmentId: string, userId: string): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user || user.departmentId?.toString() !== departmentId) {
      throw new BadRequestException('User is not a member of this department');
    }

    await this.usersService.update(userId, { departmentId: null });
  }

  async setHead(departmentId: string, userId: string): Promise<Department> {
    const department = await this.departmentModel.findById(departmentId);
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Revert previous head role if different user
    if (department.headId && department.headId.toString() !== userId) {
      await this.usersService.update(department.headId.toString(), { role: UserRole.STAFF });
    }

    // Set new head
    await this.usersService.update(userId, {
      role: UserRole.DEPT_HEAD,
      departmentId,
    });

    department.headId = user._id;
    await department.save();
    return this.departmentModel
      .findById(department._id)
      .populate('headId', 'firstName lastName email employeeId photoUrl')
      .exec() as Promise<Department>;
  }

  async delete(id: string): Promise<void> {
    const department = await this.departmentModel.findById(id);
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    const members = await this.usersService.findByDepartment(id);
    if (members.length > 0) {
      throw new BadRequestException(
        `Cannot delete department with active members. Remove all ${members.length} member(s) first.`,
      );
    }

    await this.departmentModel.findByIdAndDelete(id);
  }

  async getMembers(departmentId: string) {
    const department = await this.departmentModel.findById(departmentId);
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return this.usersService.findByDepartment(departmentId);
  }
}
