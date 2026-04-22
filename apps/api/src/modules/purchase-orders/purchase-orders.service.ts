import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserRole } from '@prams/shared';
import { PurchaseOrder } from './schemas/purchase-order.schema';
import { PurchaseRequest } from '../purchase-requests/schemas/purchase-request.schema';
import { CreatePurchaseOrderDto, UpdatePurchaseOrderDto, QueryPurchaseOrdersDto } from './dto';

interface RequestUser {
  _id: string;
  role: string;
  departmentId: string | null;
}

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectModel(PurchaseOrder.name) private poModel: Model<PurchaseOrder>,
    @InjectModel(PurchaseRequest.name) private prModel: Model<PurchaseRequest>,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreatePurchaseOrderDto, user: RequestUser): Promise<PurchaseOrder> {
    // Only procurement officers and admins can create POs
    if (!(([UserRole.PROCUREMENT, UserRole.ADMIN] as string[]).includes(user.role))) {
      throw new ForbiddenException('Only procurement officers and admins can create purchase orders');
    }

    // Verify source purchase request exists and is approved
    const sourcePr = await this.prModel.findById(dto.purchaseRequestId);
    if (!sourcePr) {
      throw new NotFoundException('Source purchase request not found');
    }

    if (sourcePr.status !== 'approved') {
      throw new BadRequestException('Source purchase request must be approved before creating a PO');
    }

    // Build line items: use provided items or copy from source PR
    let items;
    if (dto.items && dto.items.length > 0) {
      items = dto.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice,
        notes: item.notes || null,
      }));
    } else {
      // Copy from source PR, mapping estimatedPrice to unitPrice
      items = sourcePr.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.estimatedPrice,
        totalPrice: item.totalPrice,
        notes: item.notes || null,
      }));
    }

    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

    const po = new this.poModel({
      purchaseRequestId: dto.purchaseRequestId,
      sourceRequestNumber: sourcePr.prNumber || null,
      sourceRequestType: dto.sourceRequestType,
      supplierId: dto.supplierId || null,
      projectName: dto.projectName || null,
      items,
      totalAmount,
      status: 'draft',
      createdBy: user._id,
      remarks: dto.remarks || null,
    });

    const saved = await po.save();

    this.eventEmitter.emit('purchase-order.created', {
      purchaseOrderId: saved._id,
      purchaseRequestId: dto.purchaseRequestId,
      createdBy: user._id,
    });

    return saved;
  }

  async findAll(query: QueryPurchaseOrdersDto) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      supplierId,
      sourceRequestType,
      dateFrom,
      dateTo,
      sort = 'createdAt',
      order = 'desc',
    } = query;

    const filter: FilterQuery<PurchaseOrder> = {};
    const andConditions: FilterQuery<PurchaseOrder>[] = [];

    if (search) {
      andConditions.push({
        $or: [
          { poNumber: { $regex: search, $options: 'i' } },
          { sourceRequestNumber: { $regex: search, $options: 'i' } },
          { remarks: { $regex: search, $options: 'i' } },
          { projectName: { $regex: search, $options: 'i' } },
        ],
      });
    }

    if (status) {
      const statuses = status.split(',').map((s) => s.trim());
      filter.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
    }

    if (supplierId) {
      filter.supplierId = supplierId;
    }

    if (sourceRequestType) {
      filter.sourceRequestType = sourceRequestType;
    }

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.$gte = new Date(dateFrom);
      if (dateTo) dateFilter.$lte = new Date(dateTo);
      filter.createdAt = dateFilter;
    }

    if (andConditions.length > 0) {
      filter.$and = andConditions;
    }

    const sortObj: Record<string, 1 | -1> = { [sort]: order === 'asc' ? 1 : -1 };

    const [data, total] = await Promise.all([
      this.poModel
        .find(filter)
        .sort(sortObj)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('createdBy', 'firstName lastName email')
        .populate('purchaseRequestId', 'prNumber title requestType')
        .lean(),
      this.poModel.countDocuments(filter),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<PurchaseOrder> {
    const po = await this.poModel
      .findById(id)
      .populate('createdBy', 'firstName lastName email role')
      .populate('approvedBy', 'firstName lastName email role')
      .populate('purchaseRequestId', 'prNumber title requestType departmentId status totalAmount');

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    return po;
  }

  async update(id: string, dto: UpdatePurchaseOrderDto, user: RequestUser): Promise<PurchaseOrder> {
    const po = await this.poModel.findById(id);
    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    if (po.status !== 'draft') {
      throw new BadRequestException('Only draft purchase orders can be updated');
    }

    // Only the creator, procurement, or admin can update
    if (
      po.createdBy.toString() !== user._id &&
      !(([UserRole.PROCUREMENT, UserRole.ADMIN] as string[]).includes(user.role))
    ) {
      throw new ForbiddenException('You do not have permission to update this purchase order');
    }

    if (dto.supplierId !== undefined) {
      po.supplierId = dto.supplierId as never;
    }

    if (dto.projectName !== undefined) {
      po.projectName = dto.projectName;
    }

    if (dto.items && dto.items.length > 0) {
      po.items = dto.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice,
        notes: item.notes || null,
      })) as never;
      po.totalAmount = po.items.reduce((sum, item) => sum + item.totalPrice, 0);
    }

    if (dto.canvassEntries) {
      po.canvassEntries = dto.canvassEntries.map((entry) => ({
        supplierId: entry.supplierId,
        supplierName: entry.supplierName,
        quotedItems: entry.quotedItems || [],
        totalQuotedAmount: entry.totalQuotedAmount,
        remarks: entry.remarks || null,
        isSelected: entry.isSelected || false,
      })) as never;
    }

    if (dto.remarks !== undefined) {
      po.remarks = dto.remarks;
    }

    return po.save();
  }

  async submit(id: string, user: RequestUser): Promise<PurchaseOrder> {
    const po = await this.poModel.findById(id);
    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    if (po.status !== 'draft') {
      throw new BadRequestException('Only draft purchase orders can be submitted');
    }

    if (po.items.length === 0) {
      throw new BadRequestException('Purchase order must have at least one line item');
    }

    // Generate PO number
    po.poNumber = await this.generatePoNumber();
    po.status = 'submitted';

    const saved = await po.save();

    this.eventEmitter.emit('purchase-order.submitted', {
      purchaseOrderId: saved._id,
      poNumber: saved.poNumber,
      submittedBy: user._id,
    });

    return saved;
  }

  async approve(id: string, user: RequestUser): Promise<PurchaseOrder> {
    const po = await this.poModel.findById(id);
    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    if (po.status !== 'submitted') {
      throw new BadRequestException('Only submitted purchase orders can be approved');
    }

    // Only COO, CEO, or Admin can approve
    if (!(([UserRole.COO, UserRole.CEO, UserRole.ADMIN] as string[]).includes(user.role))) {
      throw new ForbiddenException('You do not have permission to approve purchase orders');
    }

    // Cannot approve own PO
    if (po.createdBy.toString() === user._id) {
      throw new ForbiddenException('You cannot approve your own purchase order');
    }

    po.status = 'approved';
    po.approvedBy = user._id as never;
    po.approvedAt = new Date();

    const saved = await po.save();

    this.eventEmitter.emit('purchase-order.approved', {
      purchaseOrderId: saved._id,
      poNumber: saved.poNumber,
      approvedBy: user._id,
    });

    return saved;
  }

  async issue(id: string, user: RequestUser): Promise<PurchaseOrder> {
    const po = await this.poModel.findById(id);
    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    if (po.status !== 'approved') {
      throw new BadRequestException('Only approved purchase orders can be issued');
    }

    // Only procurement or admin can issue
    if (!(([UserRole.PROCUREMENT, UserRole.ADMIN] as string[]).includes(user.role))) {
      throw new ForbiddenException('Only procurement officers and admins can issue purchase orders');
    }

    po.status = 'issued';
    po.issuedAt = new Date();

    const saved = await po.save();

    this.eventEmitter.emit('purchase-order.issued', {
      purchaseOrderId: saved._id,
      poNumber: saved.poNumber,
      issuedBy: user._id,
    });

    return saved;
  }

  async cancel(id: string, reason: string, user: RequestUser): Promise<PurchaseOrder> {
    const po = await this.poModel.findById(id);
    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    if (['issued', 'cancelled'].includes(po.status)) {
      throw new BadRequestException('Issued or already cancelled purchase orders cannot be cancelled');
    }

    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Cancellation reason is required');
    }

    // Only the creator, procurement, or admin can cancel
    if (
      po.createdBy.toString() !== user._id &&
      !(([UserRole.PROCUREMENT, UserRole.ADMIN] as string[]).includes(user.role))
    ) {
      throw new ForbiddenException('You do not have permission to cancel this purchase order');
    }

    po.status = 'cancelled';
    po.cancellationReason = reason.trim();

    const saved = await po.save();

    this.eventEmitter.emit('purchase-order.cancelled', {
      purchaseOrderId: saved._id,
      poNumber: saved.poNumber,
      cancelledBy: user._id,
      reason,
    });

    return saved;
  }

  /**
   * Generates a PO number in the format PO-YYYY-NNNNN.
   * Uses findOneAndUpdate with $inc for atomic increment.
   */
  private async generatePoNumber(): Promise<string> {
    const year = new Date().getFullYear();

    // Find the last PO number for this year by sorting descending
    const lastPo = await this.poModel
      .findOne({ poNumber: { $regex: `^PO-${year}-` } })
      .sort({ poNumber: -1 })
      .select('poNumber')
      .lean();

    let nextNumber = 1;
    if (lastPo?.poNumber) {
      const parts = lastPo.poNumber.split('-');
      const lastSeq = parseInt(parts[2], 10);
      if (!isNaN(lastSeq)) {
        nextNumber = lastSeq + 1;
      }
    }

    const paddedNumber = String(nextNumber).padStart(5, '0');
    return `PO-${year}-${paddedNumber}`;
  }
}
