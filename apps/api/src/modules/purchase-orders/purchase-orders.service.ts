import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { UserRole, PrStatus } from '@prams/shared';
import { PurchaseOrder } from './schemas/purchase-order.schema';
import { PurchaseRequest } from '../purchase-requests/schemas/purchase-request.schema';
import { QueryPurchaseOrdersDto, UpdatePurchaseOrderDto } from './dto';

interface RequestUser {
  _id: string;
  role: string;
  departmentId: string | null;
}

@Injectable()
export class PurchaseOrdersService {
  private readonly logger = new Logger(PurchaseOrdersService.name);

  constructor(
    @InjectModel(PurchaseOrder.name) private poModel: Model<PurchaseOrder>,
    @InjectModel(PurchaseRequest.name) private prModel: Model<PurchaseRequest>,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Auto-create a PO when COO approves a QUOTED PR.
   * Listens to the approval.action event.
   */
  @OnEvent('approval.action')
  async handleApprovalForAutoCreate(payload: {
    approval: { action: string; approvalLevel: number };
    purchaseRequest: { _id: string; status: string };
    actorId: string;
  }) {
    const { approval, purchaseRequest, actorId } = payload;

    // Only trigger on COO approval of a PR that is now COMPLETED
    if (approval.action !== 'approved' || purchaseRequest.status !== PrStatus.COMPLETED) {
      return;
    }

    try {
      await this.createFromApprovedPR(purchaseRequest._id.toString(), actorId);
    } catch (error: any) {
      this.logger.error(`Failed to auto-create PO for PR ${purchaseRequest._id}: ${error?.message}`);
    }
  }

  /**
   * Create a PO from an approved/completed PR.
   * Uses the selected supplier from canvass entries and quoted prices.
   */
  async createFromApprovedPR(prId: string, actorId: string): Promise<PurchaseOrder> {
    const pr = await this.prModel.findById(prId).exec();
    if (!pr) {
      throw new NotFoundException('Source purchase request not found');
    }

    if (pr.status !== PrStatus.COMPLETED) {
      throw new BadRequestException('Source purchase request must be completed before creating a PO');
    }

    // Check if PO already exists for this PR
    const existingPo = await this.poModel.findOne({ purchaseRequestId: pr._id }).exec();
    if (existingPo) {
      this.logger.warn(`PO already exists for PR ${prId}, skipping auto-creation`);
      return existingPo;
    }

    // Find the selected supplier from canvass entries
    const selectedCanvass = pr.canvassEntries.find((e) => e.isSelected);

    // Build line items from PR items using quoted prices
    const items = pr.items
      .filter((item) => item.sourcingType === 'procurement')
      .map((item) => {
        // Try to find quoted price from selected canvass
        const quotedItem = selectedCanvass?.quotedItems?.find(
          (qi) => qi.itemId?.toString() === item._id.toString(),
        );

        const unitPrice = quotedItem?.unitPrice ?? item.quotedUnitPrice ?? item.estimatedPrice;
        return {
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice,
          totalPrice: item.quantity * unitPrice,
          notes: item.notes || null,
        };
      });

    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

    // Copy canvass entries from PR to PO
    const canvassEntries = pr.canvassEntries.map((entry) => ({
      supplierId: entry.supplierId,
      supplierName: entry.supplierName,
      quotedItems: entry.quotedItems.map((qi) => ({
        description: qi.description,
        unitPrice: qi.unitPrice,
        totalPrice: qi.totalPrice,
        remarks: qi.remarks || null,
      })),
      totalQuotedAmount: entry.totalQuotedAmount,
      remarks: entry.remarks || null,
      isSelected: entry.isSelected,
    }));

    const poNumber = await this.generatePoNumber();

    const po = new this.poModel({
      poNumber,
      purchaseRequestId: pr._id,
      sourceRequestNumber: pr.prNumber || null,
      sourceRequestType: pr.requestType || 'purchase_request',
      supplierId: selectedCanvass?.supplierId || null,
      supplierName: selectedCanvass?.supplierName || null,
      items,
      totalAmount,
      canvassEntries,
      status: 'pending',
      createdBy: pr.requesterId,
    });

    const saved = await po.save();

    // Link PO back to PR
    pr.purchaseOrderId = saved._id as Types.ObjectId;
    await pr.save();

    this.logger.log(`Auto-created PO ${poNumber} for PR ${pr.prNumber}`);

    this.eventEmitter.emit('purchase-order.created', {
      purchaseOrder: saved.toJSON(),
      purchaseRequestId: pr._id.toString(),
      prNumber: pr.prNumber,
      requesterId: pr.requesterId.toString(),
    });

    return saved;
  }

  async findAll(query: QueryPurchaseOrdersDto, user?: RequestUser) {
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

    // Staff and dept heads can only see their own POs
    if (user && ([UserRole.STAFF, UserRole.DEPT_HEAD] as string[]).includes(user.role)) {
      filter.createdBy = new Types.ObjectId(user._id);
    }

    if (search) {
      andConditions.push({
        $or: [
          { poNumber: { $regex: search, $options: 'i' } },
          { sourceRequestNumber: { $regex: search, $options: 'i' } },
          { remarks: { $regex: search, $options: 'i' } },
          { projectName: { $regex: search, $options: 'i' } },
          { supplierName: { $regex: search, $options: 'i' } },
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
        .populate('orderedBy', 'firstName lastName email')
        .populate('receivedBy', 'firstName lastName email')
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

  async findById(id: string, user?: RequestUser): Promise<PurchaseOrder> {
    const po = await this.poModel
      .findById(id)
      .populate('createdBy', 'firstName lastName email role')
      .populate('orderedBy', 'firstName lastName email role')
      .populate('receivedBy', 'firstName lastName email role')
      .populate('purchaseRequestId', 'prNumber title requestType departmentId status totalAmount requesterId');

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    // Staff and dept heads can only view their own POs
    if (user && ([UserRole.STAFF, UserRole.DEPT_HEAD] as string[]).includes(user.role)) {
      if (po.createdBy?.toString() !== user._id && (po.createdBy as any)?._id?.toString() !== user._id) {
        throw new ForbiddenException('You can only view your own purchase orders');
      }
    }

    return po;
  }

  async findByPurchaseRequest(prId: string): Promise<PurchaseOrder | null> {
    return this.poModel
      .findOne({ purchaseRequestId: prId })
      .populate('createdBy', 'firstName lastName email')
      .populate('orderedBy', 'firstName lastName email')
      .populate('receivedBy', 'firstName lastName email')
      .exec();
  }

  async update(id: string, dto: UpdatePurchaseOrderDto, user: RequestUser): Promise<PurchaseOrder> {
    const po = await this.poModel.findById(id);
    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    if (po.status !== 'pending') {
      throw new BadRequestException('Only pending purchase orders can be updated');
    }

    if (!(([UserRole.PROCUREMENT, UserRole.ADMIN] as string[]).includes(user.role))) {
      throw new ForbiddenException('Only procurement officers and admins can update purchase orders');
    }

    if (dto.remarks !== undefined) {
      po.remarks = dto.remarks;
    }

    if (dto.estimatedArrivalDate !== undefined) {
      po.estimatedArrivalDate = dto.estimatedArrivalDate ? new Date(dto.estimatedArrivalDate) : null;
    }

    return po.save();
  }

  /**
   * Mark PO as ordered — procurement has placed the order with the supplier.
   */
  async markOrdered(id: string, estimatedArrivalDate: string | null, user: RequestUser): Promise<PurchaseOrder> {
    const po = await this.poModel.findById(id);
    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    if (po.status !== 'pending') {
      throw new BadRequestException('Only pending purchase orders can be marked as ordered');
    }

    if (!(([UserRole.PROCUREMENT, UserRole.ADMIN] as string[]).includes(user.role))) {
      throw new ForbiddenException('Only procurement officers and admins can mark orders');
    }

    po.status = 'ordered';
    po.orderedAt = new Date();
    po.orderedBy = new Types.ObjectId(user._id);
    if (estimatedArrivalDate) {
      po.estimatedArrivalDate = new Date(estimatedArrivalDate);
    }

    const saved = await po.save();

    this.eventEmitter.emit('purchase-order.ordered', {
      purchaseOrder: saved.toJSON(),
    });

    return saved;
  }

  /**
   * Update the estimated arrival date for an ordered PO.
   */
  async updateArrivalDate(id: string, estimatedArrivalDate: string, user: RequestUser): Promise<PurchaseOrder> {
    const po = await this.poModel.findById(id);
    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    if (po.status !== 'ordered') {
      throw new BadRequestException('Can only update arrival date for ordered purchase orders');
    }

    if (!(([UserRole.PROCUREMENT, UserRole.ADMIN] as string[]).includes(user.role))) {
      throw new ForbiddenException('Only procurement officers and admins can update arrival dates');
    }

    po.estimatedArrivalDate = new Date(estimatedArrivalDate);
    return po.save();
  }

  /**
   * Mark PO as received — with photo proof.
   * This is the mobile-friendly receiving endpoint.
   */
  async markReceived(
    id: string,
    user: RequestUser,
    notes: string | null,
    photos: Array<{ originalName: string; storagePath: string; mimeType: string; size: number }>,
  ): Promise<PurchaseOrder> {
    const po = await this.poModel.findById(id);
    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    if (po.status !== 'ordered') {
      throw new BadRequestException('Only ordered purchase orders can be marked as received');
    }

    if (!(([UserRole.PROCUREMENT, UserRole.ADMIN] as string[]).includes(user.role))) {
      throw new ForbiddenException('Only procurement officers and admins can receive orders');
    }

    if (!photos || photos.length === 0) {
      throw new BadRequestException('At least one proof photo is required when receiving an order');
    }

    po.status = 'received';
    po.receivedAt = new Date();
    po.receivedBy = new Types.ObjectId(user._id);
    po.receivingNotes = notes || null;
    po.proofPhotos = photos.map((photo) => ({
      originalName: photo.originalName,
      storagePath: photo.storagePath,
      mimeType: photo.mimeType,
      size: photo.size,
      uploadedBy: new Types.ObjectId(user._id),
      uploadedAt: new Date(),
    })) as any;

    const saved = await po.save();

    // Get the PR to find the requester
    const pr = await this.prModel
      .findById(po.purchaseRequestId)
      .select('requesterId prNumber')
      .exec();

    this.eventEmitter.emit('purchase-order.received', {
      purchaseOrder: saved.toJSON(),
      purchaseRequestId: po.purchaseRequestId.toString(),
      prNumber: pr?.prNumber || null,
      requesterId: pr?.requesterId?.toString() || null,
    });

    return saved;
  }

  async cancel(id: string, reason: string, user: RequestUser): Promise<PurchaseOrder> {
    const po = await this.poModel.findById(id);
    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    if (['received', 'cancelled'].includes(po.status)) {
      throw new BadRequestException('Received or already cancelled purchase orders cannot be cancelled');
    }

    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Cancellation reason is required');
    }

    if (!(([UserRole.PROCUREMENT, UserRole.ADMIN] as string[]).includes(user.role))) {
      throw new ForbiddenException('Only procurement officers and admins can cancel purchase orders');
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

  async getStats() {
    const [statusCounts, activeValueResult] = await Promise.all([
      this.poModel.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.poModel.aggregate([
        { $match: { status: { $in: ['pending', 'ordered'] } } },
        { $group: { _id: null, sum: { $sum: '$totalAmount' } } },
      ]),
    ]);

    const byStatus: Record<string, number> = {};
    for (const entry of statusCounts) {
      byStatus[entry._id] = entry.count;
    }

    const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
    const pending = byStatus['pending'] ?? 0;
    const ordered = byStatus['ordered'] ?? 0;
    const received = byStatus['received'] ?? 0;
    const cancelled = byStatus['cancelled'] ?? 0;
    const activeValue = activeValueResult[0]?.sum ?? 0;

    return { data: { total, pending, ordered, received, cancelled, activeValue } };
  }

  async getMonthlyReceivedCount(): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return this.poModel.countDocuments({ status: 'received', receivedAt: { $gte: startOfMonth } });
  }

  private async generatePoNumber(): Promise<string> {
    const year = new Date().getFullYear();

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
