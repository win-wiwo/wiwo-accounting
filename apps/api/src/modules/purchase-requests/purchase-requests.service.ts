import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrStatus, UserRole } from '@prams/shared';
import { PurchaseRequest } from './schemas/purchase-request.schema';
import { CreatePurchaseRequestDto, UpdatePurchaseRequestDto, QueryPurchaseRequestsDto } from './dto';
import { PrNumberingService } from '../pr-numbering/pr-numbering.service';
import { DepartmentsService } from '../departments/departments.service';

interface RequestUser {
  _id: string;
  role: string;
  departmentId: string | null;
}

@Injectable()
export class PurchaseRequestsService {
  constructor(
    @InjectModel(PurchaseRequest.name) private prModel: Model<PurchaseRequest>,
    private prNumberingService: PrNumberingService,
    private departmentsService: DepartmentsService,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreatePurchaseRequestDto, user: RequestUser): Promise<PurchaseRequest> {
    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException('Admin role cannot create purchase requests');
    }

    if (!user.departmentId) {
      throw new BadRequestException('You must be assigned to a department to create a PR');
    }

    const items = dto.items.map((item) => ({
      ...item,
      totalPrice: item.quantity * item.estimatedPrice,
    }));

    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

    const pr = new this.prModel({
      title: dto.title,
      description: dto.description,
      projectName: dto.projectName || null,
      requestType: dto.requestType || 'purchase_request',
      requesterId: user._id,
      departmentId: user.departmentId,
      status: PrStatus.DRAFT,
      priority: dto.priority,
      items,
      totalAmount,
      justification: dto.justification,
      neededByDate: dto.neededByDate || null,
    });

    return pr.save();
  }

  async findAll(query: QueryPurchaseRequestsDto, user: RequestUser) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      priority,
      departmentId,
      requesterId,
      dateFrom,
      dateTo,
      amountMin,
      amountMax,
      sort = 'createdAt',
      order = 'desc',
    } = query;

    const filter: FilterQuery<PurchaseRequest> = {};
    const andConditions: FilterQuery<PurchaseRequest>[] = [];

    // Non-admin users can only see their own PRs or their department's PRs
    if (user.role === UserRole.STAFF) {
      filter.requesterId = user._id;
    } else if (user.role === UserRole.DEPT_HEAD && user.departmentId) {
      andConditions.push({
        $or: [
          { requesterId: user._id },
          { departmentId: user.departmentId },
        ],
      });
    }
    // COO, CEO, Admin can see all

    if (search) {
      andConditions.push({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { prNumber: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ],
      });
    }

    if (status) {
      const statuses = status.split(',').filter(Boolean);
      if (statuses.length === 1) {
        filter.status = statuses[0];
      } else if (statuses.length > 1) {
        filter.status = { $in: statuses };
      }
    }

    if (priority) {
      filter.priority = priority;
    }

    if (departmentId) {
      filter.departmentId = departmentId;
    }

    if (requesterId) {
      filter.requesterId = requesterId;
    }

    if (query.requestType) {
      filter.requestType = query.requestType;
    }

    // Date range filters
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        filter.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endOfDay;
      }
    }

    // Amount range filters
    if (amountMin !== undefined || amountMax !== undefined) {
      filter.totalAmount = {};
      if (amountMin !== undefined) {
        filter.totalAmount.$gte = amountMin;
      }
      if (amountMax !== undefined) {
        filter.totalAmount.$lte = amountMax;
      }
    }

    // Combine $and conditions if any exist
    if (andConditions.length > 0) {
      filter.$and = andConditions;
    }

    const skip = (page - 1) * limit;
    const sortObj: Record<string, 1 | -1> = { [sort]: order === 'asc' ? 1 : -1 };

    const [prs, total] = await Promise.all([
      this.prModel
        .find(filter)
        .populate('requesterId', 'firstName lastName email employeeId')
        .populate('departmentId', 'name code')
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.prModel.countDocuments(filter),
    ]);

    return {
      data: prs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string, user: RequestUser): Promise<PurchaseRequest> {
    const pr = await this.prModel
      .findById(id)
      .populate('requesterId', 'firstName lastName email employeeId')
      .populate('departmentId', 'name code')
      .exec();

    if (!pr) {
      throw new NotFoundException('Purchase request not found');
    }

    // Staff can only see their own
    if (user.role === UserRole.STAFF && pr.requesterId._id.toString() !== user._id) {
      throw new ForbiddenException('You can only view your own purchase requests');
    }

    return pr;
  }

  async update(id: string, dto: UpdatePurchaseRequestDto, user: RequestUser): Promise<PurchaseRequest> {
    const pr = await this.prModel.findById(id).exec();

    if (!pr) {
      throw new NotFoundException('Purchase request not found');
    }

    if (pr.requesterId.toString() !== user._id) {
      throw new ForbiddenException('You can only edit your own purchase requests');
    }

    if (pr.status !== PrStatus.DRAFT && pr.status !== PrStatus.RETURNED) {
      throw new BadRequestException('Can only edit PRs in Draft or Returned status');
    }

    if (dto.items) {
      const items = dto.items.map((item) => ({
        ...item,
        totalPrice: item.quantity * item.estimatedPrice,
      }));
      const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

      pr.set('items', items);
      pr.totalAmount = totalAmount;
    }

    if (dto.title !== undefined) pr.title = dto.title;
    if (dto.description !== undefined) pr.description = dto.description;
    if (dto.projectName !== undefined) pr.projectName = dto.projectName || null;
    if (dto.priority !== undefined) pr.priority = dto.priority;
    if (dto.justification !== undefined) pr.justification = dto.justification;
    if (dto.neededByDate !== undefined) pr.neededByDate = new Date(dto.neededByDate);

    await pr.save();

    return this.prModel
      .findById(id)
      .populate('requesterId', 'firstName lastName email employeeId')
      .populate('departmentId', 'name code')
      .exec() as Promise<PurchaseRequest>;
  }

  async submit(id: string, user: RequestUser): Promise<PurchaseRequest> {
    const pr = await this.prModel.findById(id).exec();

    if (!pr) {
      throw new NotFoundException('Purchase request not found');
    }

    if (pr.requesterId.toString() !== user._id) {
      throw new ForbiddenException('You can only submit your own purchase requests');
    }

    if (pr.status !== PrStatus.DRAFT && pr.status !== PrStatus.RETURNED) {
      throw new BadRequestException('Can only submit PRs in Draft or Returned status');
    }

    if (!pr.items || pr.items.length === 0) {
      throw new BadRequestException('PR must have at least one line item');
    }

    // Generate PR number on first submission
    if (!pr.prNumber) {
      const dept = await this.departmentsService.findById(pr.departmentId.toString());
      const prefixOverride = (pr as any).requestType === 'job_request' ? 'JR' : undefined;
      pr.prNumber = await this.prNumberingService.generatePrNumber(dept.code, prefixOverride);
    }

    pr.status = PrStatus.SUBMITTED;
    pr.currentApprovalLevel = 1;
    pr.submittedAt = new Date();

    await pr.save();

    this.eventEmitter.emit('pr.submitted', {
      purchaseRequest: pr.toJSON(),
    });

    return this.prModel
      .findById(id)
      .populate('requesterId', 'firstName lastName email employeeId')
      .populate('departmentId', 'name code')
      .exec() as Promise<PurchaseRequest>;
  }

  async recall(id: string, user: RequestUser): Promise<PurchaseRequest> {
    const pr = await this.prModel.findById(id).exec();

    if (!pr) {
      throw new NotFoundException('Purchase request not found');
    }

    if (pr.requesterId.toString() !== user._id) {
      throw new ForbiddenException('You can only recall your own purchase requests');
    }

    if (pr.status !== PrStatus.SUBMITTED) {
      throw new BadRequestException('Can only recall PRs that are in Submitted status (before review begins)');
    }

    pr.status = PrStatus.DRAFT;
    pr.currentApprovalLevel = 0;
    await pr.save();

    return this.prModel
      .findById(id)
      .populate('requesterId', 'firstName lastName email employeeId')
      .populate('departmentId', 'name code')
      .exec() as Promise<PurchaseRequest>;
  }

  async cancel(id: string, reason: string, user: RequestUser): Promise<PurchaseRequest> {
    const pr = await this.prModel.findById(id).exec();

    if (!pr) {
      throw new NotFoundException('Purchase request not found');
    }

    if (pr.requesterId.toString() !== user._id) {
      throw new ForbiddenException('You can only cancel your own purchase requests');
    }

    const cancellableStatuses: string[] = [PrStatus.DRAFT, PrStatus.SUBMITTED];
    if (!cancellableStatuses.includes(pr.status)) {
      throw new BadRequestException('Can only cancel PRs in Draft or Submitted status');
    }

    if (!reason?.trim()) {
      throw new BadRequestException('A cancellation reason is required');
    }

    pr.status = PrStatus.CANCELLED;
    pr.currentApprovalLevel = 0;
    pr.set('cancellationReason', reason.trim());
    await pr.save();

    return this.prModel
      .findById(id)
      .populate('requesterId', 'firstName lastName email employeeId')
      .populate('departmentId', 'name code')
      .exec() as Promise<PurchaseRequest>;
  }

  async addAttachment(
    id: string,
    file: Express.Multer.File,
    user: RequestUser,
  ): Promise<PurchaseRequest> {
    const pr = await this.prModel.findById(id).exec();

    if (!pr) {
      throw new NotFoundException('Purchase request not found');
    }

    if (pr.requesterId.toString() !== user._id) {
      throw new ForbiddenException('You can only add attachments to your own purchase requests');
    }

    const editableStatuses: string[] = [PrStatus.DRAFT, PrStatus.RETURNED];
    if (!editableStatuses.includes(pr.status)) {
      throw new BadRequestException('Can only add attachments to PRs in Draft or Returned status');
    }

    pr.attachments.push({
      originalName: file.originalname,
      storagePath: file.path,
      mimeType: file.mimetype,
      size: file.size,
      uploadedBy: user._id as unknown as import('mongoose').Types.ObjectId,
      uploadedAt: new Date(),
    } as unknown as import('./schemas/purchase-request.schema').Attachment);

    await pr.save();

    return this.prModel
      .findById(id)
      .populate('requesterId', 'firstName lastName email employeeId')
      .populate('departmentId', 'name code')
      .exec() as Promise<PurchaseRequest>;
  }

  async removeAttachment(
    id: string,
    attachmentId: string,
    user: RequestUser,
  ): Promise<PurchaseRequest> {
    const pr = await this.prModel.findById(id).exec();

    if (!pr) {
      throw new NotFoundException('Purchase request not found');
    }

    if (pr.requesterId.toString() !== user._id) {
      throw new ForbiddenException('You can only remove attachments from your own purchase requests');
    }

    const editableStatuses: string[] = [PrStatus.DRAFT, PrStatus.RETURNED];
    if (!editableStatuses.includes(pr.status)) {
      throw new BadRequestException('Can only remove attachments from PRs in Draft or Returned status');
    }

    pr.attachments = pr.attachments.filter(
      (a) => a._id.toString() !== attachmentId,
    );

    await pr.save();

    return this.prModel
      .findById(id)
      .populate('requesterId', 'firstName lastName email employeeId')
      .populate('departmentId', 'name code')
      .exec() as Promise<PurchaseRequest>;
  }

  async delete(id: string, user: RequestUser): Promise<void> {
    const pr = await this.prModel.findById(id).exec();

    if (!pr) {
      throw new NotFoundException('Purchase request not found');
    }

    if (pr.requesterId.toString() !== user._id) {
      throw new ForbiddenException('You can only delete your own purchase requests');
    }

    if (pr.status !== PrStatus.DRAFT) {
      throw new BadRequestException('Can only delete PRs in Draft status');
    }

    await this.prModel.findByIdAndDelete(id).exec();
  }

  async getStats(user: RequestUser) {
    const matchStage: FilterQuery<PurchaseRequest> = {};

    if (user.role === UserRole.STAFF) {
      matchStage.requesterId = user._id;
    } else if (user.role === UserRole.DEPT_HEAD && user.departmentId) {
      matchStage.$or = [
        { requesterId: user._id },
        { departmentId: user.departmentId },
      ];
    }

    const stats = await this.prModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
        },
      },
    ]);

    const result: Record<string, { count: number; totalAmount: number }> = {};
    for (const s of stats) {
      result[s._id] = { count: s.count, totalAmount: s.totalAmount };
    }

    const total = stats.reduce((sum, s) => sum + s.count, 0);

    return {
      total,
      byStatus: result,
    };
  }
}
