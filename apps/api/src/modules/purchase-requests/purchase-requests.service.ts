import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { SubmitQuotationDto } from './dto';
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

  private buildRequestTitle(
    items: Array<{ description: string }>,
    requestType: string,
  ): string {
    const normalized = items
      .map((item) => item.description.trim())
      .filter(Boolean);

    if (normalized.length === 0) {
      return requestType === 'job_request' ? 'Job Request' : 'Purchase Request';
    }

    const [first, second] = normalized;
    let title = first;

    if (normalized.length > 2) {
      title += ` +${normalized.length - 1} more items`;
    } else if (second) {
      title += ` + ${second}`;
    }

    return title.slice(0, 200);
  }

  private resolveRequestTitle(
    title: string | undefined,
    items: Array<{ description: string }>,
    requestType: string,
  ): string {
    const normalized = title?.trim();
    return normalized ? normalized.slice(0, 200) : this.buildRequestTitle(items, requestType);
  }

  async create(dto: CreatePurchaseRequestDto, user: RequestUser): Promise<PurchaseRequest> {
    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException('Admin role cannot create purchase requests');
    }

    if (!user.departmentId) {
      throw new BadRequestException('You must be assigned to a department to create a PR');
    }

    const items = dto.items.map((item) => {
      const price = item.estimatedPrice ?? 0;
      return {
        ...item,
        estimatedPrice: price,
        totalPrice: item.quantity * price,
      };
    });

    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const requestType = dto.requestType || 'purchase_request';

    const pr = new this.prModel({
      title: this.resolveRequestTitle(dto.title, items, requestType),
      description: '',
      projectId: dto.projectId ? new Types.ObjectId(dto.projectId) : null,
      requestType,
      requesterId: new Types.ObjectId(user._id),
      departmentId: new Types.ObjectId(user.departmentId),
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

    // Role-based visibility
    if (user.role === UserRole.STAFF) {
      filter.requesterId = new Types.ObjectId(user._id);
    } else if (user.role === UserRole.DEPT_HEAD) {
      if (user.departmentId) {
        andConditions.push({
          $or: [
            { requesterId: new Types.ObjectId(user._id) },
            { departmentId: new Types.ObjectId(user.departmentId) },
          ],
        });
      } else {
        filter.requesterId = new Types.ObjectId(user._id);
      }
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
      filter.departmentId = new Types.ObjectId(departmentId);
    }

    if (requesterId) {
      filter.requesterId = new Types.ObjectId(requesterId);
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
        .populate('projectId', 'name code')
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
      .populate('projectId', 'name code')
      .populate('quotationReturnHistory.returnedBy', 'firstName lastName')
      .populate('recallHistory.recalledBy', 'firstName lastName')
      .exec();

    if (!pr) {
      throw new NotFoundException('Purchase request not found');
    }

    if (user.role === UserRole.STAFF) {
      if (pr.requesterId._id.toString() !== user._id) {
        throw new ForbiddenException('You can only view your own purchase requests');
      }
    } else if (user.role === UserRole.DEPT_HEAD && user.departmentId) {
      const deptId = (pr.departmentId as unknown as { _id: Types.ObjectId })._id.toString();
      const isOwn = pr.requesterId._id.toString() === user._id;
      const isDeptPr = deptId === user.departmentId;
      if (!isOwn && !isDeptPr) {
        throw new ForbiddenException('You can only view purchase requests from your department');
      }
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

    const editableStatuses: string[] = [PrStatus.DRAFT, PrStatus.RETURNED, PrStatus.RETURNED_FOR_INFO];
    if (!editableStatuses.includes(pr.status)) {
      throw new BadRequestException('Can only edit PRs in Draft, Returned, or Returned for Info status');
    }

    if (dto.items) {
      const existingItemsById = new Map(
        pr.items.map((item) => [item._id.toString(), item]),
      );

      const items = dto.items.map((item) => {
        const price = item.estimatedPrice ?? 0;
        const existing = item._id ? existingItemsById.get(item._id) : undefined;
        return {
          ...item,
          estimatedPrice: price,
          totalPrice: item.quantity * price,
          referencePhotoPath: existing?.referencePhotoPath ?? null,
          referencePhotoOriginalName: existing?.referencePhotoOriginalName ?? null,
        };
      });
      const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

      pr.set('items', items);
      pr.totalAmount = totalAmount;
    }

    if (dto.title !== undefined) {
      pr.title = this.resolveRequestTitle(dto.title, pr.items, pr.requestType);
    }
    if (dto.projectId !== undefined) pr.projectId = dto.projectId ? new Types.ObjectId(dto.projectId) : null;
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

    const submittableStatuses: string[] = [PrStatus.DRAFT, PrStatus.RETURNED, PrStatus.RETURNED_FOR_INFO];
    if (!submittableStatuses.includes(pr.status)) {
      throw new BadRequestException('Can only submit PRs in Draft, Returned, or Returned for Info status');
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

    // Dept heads skip level-1 review — their PRs go straight to COO (level 2)
    const isDeptHead = user.role === UserRole.DEPT_HEAD;
    const hasProcurementItems = pr.items.some((item) => item.sourcingType === 'procurement');

    if (hasProcurementItems) {
      pr.status = PrStatus.PENDING_QUOTATION;
      // currentApprovalLevel = 2 signals submitQuotation to skip to COO after quoting
      pr.currentApprovalLevel = isDeptHead ? 2 : 0;
    } else {
      pr.status = isDeptHead ? PrStatus.LEVEL2_REVIEW : PrStatus.LEVEL1_REVIEW;
      pr.currentApprovalLevel = isDeptHead ? 2 : 1;
    }

    pr.submittedAt = new Date();
    pr.set('quotationNote', null);

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

  async submitQuotation(
    id: string,
    dto: SubmitQuotationDto,
    user: RequestUser,
  ): Promise<PurchaseRequest> {
    const pr = await this.prModel.findById(id).exec();

    if (!pr) throw new NotFoundException('Purchase request not found');

    if (pr.status !== PrStatus.PENDING_QUOTATION) {
      throw new BadRequestException('PR is not awaiting quotation');
    }

    const now = new Date();

    for (const quotedItem of dto.items) {
      const item = pr.items.find((i) => i._id.toString() === quotedItem.itemId);
      if (!item) throw new BadRequestException(`Line item ${quotedItem.itemId} not found`);

      item.quotedUnitPrice = quotedItem.quotedUnitPrice;
      item.quotedAt = now;
      if (quotedItem.selectedSupplierId) {
        item.selectedSupplierId = new Types.ObjectId(quotedItem.selectedSupplierId);
      }
      // Recalculate totals using quoted price
      item.estimatedPrice = quotedItem.quotedUnitPrice;
      item.totalPrice = item.quantity * quotedItem.quotedUnitPrice;
    }

    // Recalculate PR total from quoted + existing online prices
    pr.totalAmount = pr.items.reduce((sum, item) => sum + item.totalPrice, 0);

    // If currentApprovalLevel was pre-set to 2 at submit time, the requester was a dept_head
    // — skip level-1 and send straight to COO
    if (pr.currentApprovalLevel >= 2) {
      pr.status = PrStatus.LEVEL2_REVIEW;
      pr.currentApprovalLevel = 2;
    } else {
      pr.status = PrStatus.QUOTED;
      pr.currentApprovalLevel = 1;
    }
    pr.set('quotationNote', null);

    await pr.save();

    this.eventEmitter.emit('pr.quoted', { purchaseRequest: pr.toJSON(), quotedBy: user._id });

    return this.prModel
      .findById(id)
      .populate('requesterId', 'firstName lastName email employeeId')
      .populate('departmentId', 'name code')
      .exec() as Promise<PurchaseRequest>;
  }

  async returnForInfo(
    id: string,
    note: string,
    user: RequestUser,
  ): Promise<PurchaseRequest> {
    const pr = await this.prModel.findById(id).exec();

    if (!pr) throw new NotFoundException('Purchase request not found');

    if (pr.status !== PrStatus.PENDING_QUOTATION) {
      throw new BadRequestException('PR is not awaiting quotation');
    }

    if (!note?.trim()) throw new BadRequestException('A note is required when returning for info');

    pr.status = PrStatus.RETURNED_FOR_INFO;
    pr.currentApprovalLevel = 0;
    pr.set('quotationNote', note.trim());
    pr.quotationReturnHistory.push({
      note: note.trim(),
      returnedBy: new Types.ObjectId(user._id),
      returnedAt: new Date(),
    } as any);

    await pr.save();

    this.eventEmitter.emit('pr.returned_for_info', { purchaseRequest: pr.toJSON(), returnedBy: user._id });

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

    const recallableStatuses: string[] = [
      PrStatus.SUBMITTED,
      PrStatus.LEVEL1_REVIEW,
      PrStatus.LEVEL2_REVIEW,
      PrStatus.PENDING_QUOTATION,
      PrStatus.RETURNED_FOR_INFO,
    ];
    if (!recallableStatuses.includes(pr.status)) {
      throw new BadRequestException('Can only recall PRs before review has started');
    }

    pr.status = PrStatus.DRAFT;
    pr.currentApprovalLevel = 0;
    pr.recallHistory.push({
      recalledBy: new Types.ObjectId(user._id),
      recalledAt: new Date(),
    } as any);
    await pr.save();

    this.eventEmitter.emit('pr.recalled', {
      purchaseRequest: pr.toJSON(),
      recalledBy: user._id,
    });

    return this.prModel
      .findById(id)
      .populate('requesterId', 'firstName lastName email employeeId')
      .populate('departmentId', 'name code')
      .populate('projectId', 'name code')
      .populate('quotationReturnHistory.returnedBy', 'firstName lastName')
      .populate('recallHistory.recalledBy', 'firstName lastName')
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

    const cancellableStatuses: string[] = [PrStatus.DRAFT, PrStatus.SUBMITTED, PrStatus.PENDING_QUOTATION, PrStatus.RETURNED_FOR_INFO];
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

    const editableStatuses: string[] = [PrStatus.DRAFT, PrStatus.RETURNED, PrStatus.RETURNED_FOR_INFO];
    if (!editableStatuses.includes(pr.status)) {
      throw new BadRequestException('Can only add attachments to PRs in Draft, Returned, or Returned for Info status');
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

    const editableStatuses: string[] = [PrStatus.DRAFT, PrStatus.RETURNED, PrStatus.RETURNED_FOR_INFO];
    if (!editableStatuses.includes(pr.status)) {
      throw new BadRequestException('Can only remove attachments from PRs in Draft, Returned, or Returned for Info status');
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

  async uploadItemPhoto(
    id: string,
    itemId: string,
    file: Express.Multer.File,
    user: RequestUser,
  ): Promise<PurchaseRequest> {
    const pr = await this.prModel.findById(id).exec();

    if (!pr) throw new NotFoundException('Purchase request not found');

    if (pr.requesterId.toString() !== user._id) {
      throw new ForbiddenException('You can only modify your own purchase requests');
    }

    const editableStatuses: string[] = [PrStatus.DRAFT, PrStatus.RETURNED, PrStatus.RETURNED_FOR_INFO];
    if (!editableStatuses.includes(pr.status)) {
      throw new BadRequestException('Can only add photos to PRs in Draft, Returned, or Returned for Info status');
    }

    const item = pr.items.find((i) => i._id.toString() === itemId);
    if (!item) throw new NotFoundException('Line item not found');

    // Delete old photo file if it exists
    if (item.referencePhotoPath && existsSync(item.referencePhotoPath)) {
      await unlink(item.referencePhotoPath).catch(() => null);
    }

    item.referencePhotoPath = file.path;
    item.referencePhotoOriginalName = file.originalname;

    await pr.save();

    return this.prModel
      .findById(id)
      .populate('requesterId', 'firstName lastName email employeeId')
      .populate('departmentId', 'name code')
      .exec() as Promise<PurchaseRequest>;
  }

  async removeItemPhoto(
    id: string,
    itemId: string,
    user: RequestUser,
  ): Promise<PurchaseRequest> {
    const pr = await this.prModel.findById(id).exec();

    if (!pr) throw new NotFoundException('Purchase request not found');

    if (pr.requesterId.toString() !== user._id) {
      throw new ForbiddenException('You can only modify your own purchase requests');
    }

    const item = pr.items.find((i) => i._id.toString() === itemId);
    if (!item) throw new NotFoundException('Line item not found');

    if (item.referencePhotoPath && existsSync(item.referencePhotoPath)) {
      await unlink(item.referencePhotoPath).catch(() => null);
    }

    item.referencePhotoPath = null;
    item.referencePhotoOriginalName = null;

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
      matchStage.requesterId = new Types.ObjectId(user._id);
    } else if (user.role === UserRole.DEPT_HEAD && user.departmentId) {
      matchStage.$or = [
        { requesterId: new Types.ObjectId(user._id) },
        { departmentId: new Types.ObjectId(user.departmentId) },
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
