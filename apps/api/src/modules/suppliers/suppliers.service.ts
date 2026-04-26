import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { Supplier } from './schemas/supplier.schema';
import { CreateSupplierDto, UpdateSupplierDto, QuerySuppliersDto } from './dto';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectModel(Supplier.name) private supplierModel: Model<Supplier>,
  ) {}

  async create(dto: CreateSupplierDto, userId: string): Promise<Supplier> {
    const existingTin = await this.supplierModel.findOne({ tin: dto.tin });
    if (existingTin) {
      throw new ConflictException('A supplier with this TIN already exists');
    }

    const supplier = new this.supplierModel({
      ...dto,
      createdBy: userId,
    });

    return supplier.save();
  }

  async findAll(query: QuerySuppliersDto) {
    const { page = 1, limit = 10, search, status, taxType, sort = 'companyName', order = 'asc' } = query;

    const filter: FilterQuery<Supplier> = {};

    if (search) {
      filter.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { tin: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) {
      filter.status = status;
    }

    if (taxType) {
      filter.taxType = taxType;
    }

    const skip = (page - 1) * limit;
    const sortOption: Record<string, 1 | -1> = { [sort]: order === 'desc' ? -1 : 1 };

    const [suppliers, total] = await Promise.all([
      this.supplierModel
        .find(filter)
        .populate('createdBy', 'firstName lastName email')
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.supplierModel.countDocuments(filter),
    ]);

    return {
      data: suppliers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Supplier> {
    const supplier = await this.supplierModel
      .findById(id)
      .populate('createdBy', 'firstName lastName email')
      .exec();

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return supplier;
  }

  async getStats() {
    const [total, active, inactive, blacklisted, missingContact] = await Promise.all([
      this.supplierModel.countDocuments({}),
      this.supplierModel.countDocuments({ status: 'active' }),
      this.supplierModel.countDocuments({ status: 'inactive' }),
      this.supplierModel.countDocuments({ status: 'blacklisted' }),
      this.supplierModel.countDocuments({
        $and: [
          { status: 'active' },
          { $or: [{ contactPerson: null }, { contactNumber: null }, { email: null }] },
        ],
      }),
    ]);
    return { data: { total, active, inactive, blacklisted, missingContact } };
  }

  async update(id: string, dto: UpdateSupplierDto): Promise<Supplier> {
    if (dto.tin) {
      const existing = await this.supplierModel.findOne({ tin: dto.tin, _id: { $ne: id } });
      if (existing) {
        throw new ConflictException('A supplier with this TIN already exists');
      }
    }

    const supplier = await this.supplierModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .populate('createdBy', 'firstName lastName email')
      .exec();

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return supplier;
  }
}
