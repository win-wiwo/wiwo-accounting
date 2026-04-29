import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { User } from './schemas/user.schema';
import { CreateUserDto, UpdateUserDto, QueryUsersDto } from './dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingEmail = await this.userModel.findOne({ email: createUserDto.email.toLowerCase() });
    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    const existingEmpId = await this.userModel.findOne({ employeeId: createUserDto.employeeId });
    if (existingEmpId) {
      throw new ConflictException('Employee ID already exists');
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 12);

    const user = new this.userModel({
      ...createUserDto,
      email: createUserDto.email.toLowerCase(),
      passwordHash,
    });

    return user.save();
  }

  async findAll(query: QueryUsersDto) {
    const { page = 1, limit = 10, search, role, departmentId, sort = 'createdAt', order = 'desc', isActive } = query;

    const filter: FilterQuery<User> = { isActive: isActive === 'false' ? false : true };

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
      ];
    }

    if (role) {
      filter.role = role;
    }

    if (departmentId) {
      filter.departmentId = new Types.ObjectId(departmentId);
    }

    const skip = (page - 1) * limit;
    const sortObj: Record<string, 1 | -1> = { [sort]: order === 'asc' ? 1 : -1 };

    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .populate('departmentId', 'name code')
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(filter),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<User> {
    const user = await this.userModel
      .findById(id)
      .populate('departmentId', 'name code')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    if (updateUserDto.email) {
      const existing = await this.userModel.findOne({
        email: updateUserDto.email.toLowerCase(),
        _id: { $ne: id },
      });
      if (existing) {
        throw new ConflictException('Email already exists');
      }
    }

    const updateData: Record<string, unknown> = { ...updateUserDto };
    if (updateData.departmentId) {
      updateData.departmentId = new Types.ObjectId(updateData.departmentId as string);
    }

    const user = await this.userModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .populate('departmentId', 'name code')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async deactivate(id: string): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(id, { $set: { isActive: false, refreshToken: null } }, { new: true })
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async activate(id: string): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(id, { $set: { isActive: true } }, { new: true })
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateRefreshToken(id: string, refreshToken: string | null): Promise<void> {
    const hashedToken = refreshToken ? await bcrypt.hash(refreshToken, 12) : null;
    await this.userModel.findByIdAndUpdate(id, { refreshToken: hashedToken }).exec();
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(id, { lastLoginAt: new Date() }).exec();
  }

  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.userModel.findByIdAndUpdate(id, { passwordHash, refreshToken: null }).exec();
  }

  async uploadPhoto(id: string, file: Express.Multer.File): Promise<User> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('User not found');

    if (user.photoUrl && user.photoUrl.startsWith('/uploads/')) {
      const oldPath = join(process.cwd(), user.photoUrl);
      if (existsSync(oldPath)) unlinkSync(oldPath);
    }

    const photoUrl = `/uploads/user-photos/${file.filename}`;
    const updated = await this.userModel
      .findByIdAndUpdate(id, { $set: { photoUrl } }, { new: true })
      .populate('departmentId', 'name code')
      .exec();

    return updated!;
  }

  async uploadSignature(id: string, file: Express.Multer.File): Promise<User> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('User not found');

    if (user.signatureUrl && user.signatureUrl.startsWith('/uploads/')) {
      const oldPath = join(process.cwd(), user.signatureUrl);
      if (existsSync(oldPath)) unlinkSync(oldPath);
    }

    const signatureUrl = `/uploads/signatures/${file.filename}`;
    const updated = await this.userModel
      .findByIdAndUpdate(id, { $set: { signatureUrl } }, { new: true })
      .populate('departmentId', 'name code')
      .exec();

    return updated!;
  }

  async removeSignature(id: string): Promise<User> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('User not found');

    if (user.signatureUrl && user.signatureUrl.startsWith('/uploads/')) {
      const oldPath = join(process.cwd(), user.signatureUrl);
      if (existsSync(oldPath)) unlinkSync(oldPath);
    }

    const updated = await this.userModel
      .findByIdAndUpdate(id, { $set: { signatureUrl: null } }, { new: true })
      .populate('departmentId', 'name code')
      .exec();

    return updated!;
  }

  async findByDepartment(departmentId: string): Promise<User[]> {
    return this.userModel
      .find({ departmentId: new Types.ObjectId(departmentId), isActive: true })
      .select('-passwordHash -refreshToken')
      .exec();
  }
}
