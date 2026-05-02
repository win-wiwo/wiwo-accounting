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
import { join } from 'path';
import { SubmitQuotationDto, SaveCanvassDraftDto } from './dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AttachmentCategory, normalizePrStatus, PrStatus, SourcingType, UserRole } from '@prams/shared';
import { PurchaseRequest } from './schemas/purchase-request.schema';
import { CreatePurchaseRequestDto, UpdatePurchaseRequestDto, QueryPurchaseRequestsDto } from './dto';
import { PrNumberingService } from '../pr-numbering/pr-numbering.service';
import { Supplier } from '../suppliers/schemas/supplier.schema';

interface RequestUser {
  _id: string;
  role: string;
  departmentId: string | null;
}

@Injectable()
export class PurchaseRequestsService {
  constructor(
    @InjectModel(PurchaseRequest.name) private prModel: Model<PurchaseRequest>,
    @InjectModel(Supplier.name) private supplierModel: Model<Supplier>,
    private prNumberingService: PrNumberingService,
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

    // PR-level mode is the source of truth — every item must match it.
    const sourcingMode = dto.sourcingMode;
    if (sourcingMode !== SourcingType.ONLINE && sourcingMode !== SourcingType.PROCUREMENT) {
      throw new BadRequestException('sourcingMode must be either online or procurement');
    }
    const mismatch = dto.items.find((item) => item.sourcingType && item.sourcingType !== sourcingMode);
    if (mismatch) {
      throw new BadRequestException(`Item "${mismatch.description}" sourcingType does not match the PR sourcingMode (${sourcingMode})`);
    }

    const items = dto.items.map((item) => {
      const price = item.estimatedPrice ?? 0;
      return {
        ...item,
        sourcingType: sourcingMode,
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
      sourcingMode,
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
    const visibilityFilter = this.buildVisibilityFilter(user);
    if (visibilityFilter.$or) {
      andConditions.push({ $or: visibilityFilter.$or });
    } else if (visibilityFilter.requesterId) {
      filter.requesterId = visibilityFilter.requesterId;
    }

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
        .populate('requesterId', 'firstName lastName email employeeId photoUrl')
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
      .populate('requesterId', 'firstName lastName email employeeId photoUrl')
      .populate('departmentId', 'name code')
      .populate('projectId', 'name code')
      .populate('items.selectedSupplierId', 'companyName')
      .populate('quotationReturnHistory.returnedBy', 'firstName lastName')
      .populate('clarificationReplies.repliedBy', 'firstName lastName')
      .populate('quotationSubmissionHistory.submittedBy', 'firstName lastName')
      .populate('recallHistory.recalledBy', 'firstName lastName')
      .exec();

    if (!pr) {
      throw new NotFoundException('Purchase request not found');
    }

    const isOwn = pr.requesterId._id.toString() === user._id;

    // Draft PRs are only visible to their creator
    if (pr.status === PrStatus.DRAFT && !isOwn) {
      throw new ForbiddenException('Draft purchase requests are only visible to their creator');
    }

    if (user.role === UserRole.STAFF) {
      if (!isOwn) {
        throw new ForbiddenException('You can only view your own purchase requests');
      }
    } else if (user.role === UserRole.DEPT_HEAD && user.departmentId) {
      const deptId = (pr.departmentId as unknown as { _id: Types.ObjectId })._id.toString();
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

    const editableStatuses: string[] = [PrStatus.DRAFT, PrStatus.RETURNED];
    if (!editableStatuses.includes(pr.status)) {
      throw new BadRequestException('Can only edit PRs in Draft or Returned status');
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
    if (dto.resubmissionNote !== undefined) pr.set('resubmissionNote', dto.resubmissionNote || null);

    await pr.save();

    return this.prModel
      .findById(id)
      .populate('requesterId', 'firstName lastName email employeeId photoUrl')
      .populate('departmentId', 'name code')
      .exec() as Promise<PurchaseRequest>;
  }

  async submit(id: string, user: RequestUser, resubmissionNote?: string): Promise<PurchaseRequest> {
    const pr = await this.prModel.findById(id).exec();

    if (!pr) {
      throw new NotFoundException('Purchase request not found');
    }

    if (pr.requesterId.toString() !== user._id) {
      throw new ForbiddenException('You can only submit your own purchase requests');
    }

    const submittableStatuses: string[] = [PrStatus.DRAFT, PrStatus.RETURNED];
    if (!submittableStatuses.includes(pr.status)) {
      throw new BadRequestException('Can only submit PRs in Draft or Returned status');
    }

    if (!pr.items || pr.items.length === 0) {
      throw new BadRequestException('PR must have at least one line item');
    }

    // Generate PR number on first submission
    if (!pr.prNumber) {
      pr.prNumber = await this.prNumberingService.generatePrNumber();
    }

    // Resubmit of a returned PR: route straight back to the approver who
    // returned it instead of restarting the chain. Falls back to the default
    // entry level if the field is missing (legacy data).
    const wasReturned = pr.status === PrStatus.RETURNED;
    const returnedAtLevel = (pr as any).returnedAtLevel as number | null;
    const isDeptHead = user.role === UserRole.DEPT_HEAD;
    const now = new Date();

    if (wasReturned && returnedAtLevel != null) {
      if (returnedAtLevel === 0) {
        // Returned by procurement — route back to procurement queue
        pr.status = PrStatus.PENDING_QUOTATION;
        pr.currentApprovalLevel = 0;
        pr.set('returnedAtLevel', null);
      } else {
        const STATUS_BY_LEVEL: Record<number, PrStatus> = {
          1: PrStatus.LEVEL1_REVIEW,
          2: PrStatus.LEVEL2_REVIEW,
          3: PrStatus.LEVEL3_REVIEW,
        };
        const target = STATUS_BY_LEVEL[returnedAtLevel];
        if (target) {
          pr.status = target;
          pr.currentApprovalLevel = returnedAtLevel;
        } else {
          pr.status = isDeptHead ? PrStatus.LEVEL2_REVIEW : PrStatus.LEVEL1_REVIEW;
          pr.currentApprovalLevel = isDeptHead ? 2 : 1;
        }
        pr.set('returnedAtLevel', null);
      }
    } else if (isDeptHead) {
      pr.status = PrStatus.LEVEL2_REVIEW;
      pr.currentApprovalLevel = 2;
    } else {
      pr.status = PrStatus.LEVEL1_REVIEW;
      pr.currentApprovalLevel = 1;
    }

    // If a resubmission note was provided directly on submit, store it
    if (wasReturned && resubmissionNote?.trim()) {
      pr.set('resubmissionNote', resubmissionNote.trim());
    }

    // First submission: stamp submittedAt. Resubmits push a new entry to
    // resubmissionHistory and leave submittedAt as the original date.
    if (wasReturned) {
      const note = resubmissionNote?.trim() || (pr as any).resubmissionNote as string | null;
      pr.resubmissionHistory.push({
        _id: new Types.ObjectId(),
        resubmittedAt: now,
        note: note || null,
        resumedAtLevel: pr.currentApprovalLevel,
      } as any);
    } else {
      pr.submittedAt = now;
    }
    pr.set('quotationNote', null);

    await pr.save();

    this.eventEmitter.emit('pr.submitted', {
      purchaseRequest: pr.toJSON(),
    });

    return this.prModel
      .findById(id)
      .populate('requesterId', 'firstName lastName email employeeId photoUrl')
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

    if (!([UserRole.PROCUREMENT, UserRole.ADMIN] as string[]).includes(user.role)) {
      throw new ForbiddenException('Only Procurement can submit quotation');
    }

    if (pr.status !== PrStatus.PENDING_QUOTATION) {
      throw new BadRequestException('PR is not awaiting quotation');
    }

    if (pr.sourcingMode !== SourcingType.PROCUREMENT) {
      throw new BadRequestException('Only procurement-mode PRs can be canvassed');
    }

    // In single-mode PRs, every item is a procurement item.
    const procurementItems = pr.items;
    if (procurementItems.length === 0) {
      throw new BadRequestException('PR has no items to canvass');
    }

    if (!dto.canvassEntries?.length) {
      throw new BadRequestException('At least one canvass entry is required');
    }

    const uniqueSupplierIds = new Set(dto.canvassEntries.map((entry) => entry.supplierId));
    if (uniqueSupplierIds.size !== dto.canvassEntries.length) {
      throw new BadRequestException('Each canvass entry must use a different supplier');
    }

    const selectedEntries = dto.canvassEntries.filter((entry) => entry.isSelected);
    if (selectedEntries.length !== 1) {
      throw new BadRequestException('Select exactly one winning supplier');
    }

    const canvassJustification = dto.canvassJustification?.trim() || null;
    if (dto.canvassEntries.length < 3 && !canvassJustification) {
      throw new BadRequestException('Provide a justification when fewer than 3 suppliers are quoted');
    }

    const procurementItemIds = new Set(procurementItems.map((item) => item._id.toString()));
    const suppliers = await this.supplierModel.find({
      _id: { $in: [...uniqueSupplierIds].map((supplierId) => new Types.ObjectId(supplierId)) },
      status: 'active',
    }).exec();
    if (suppliers.length !== uniqueSupplierIds.size) {
      throw new BadRequestException('One or more selected suppliers are invalid or inactive');
    }
    const supplierMap = new Map(
      suppliers.map((supplier) => [supplier._id.toString(), supplier.companyName]),
    );

    const now = new Date();
    const normalizedEntries = dto.canvassEntries.map((entry) => {
      const seenItemIds = new Set<string>();
      if (entry.quotedItems.length !== procurementItems.length) {
        throw new BadRequestException(`Supplier ${supplierMap.get(entry.supplierId) ?? entry.supplierId} must quote all procurement items`);
      }

      const normalizedQuotedItems = entry.quotedItems.map((quotedItem) => {
        const item = procurementItems.find((candidate) => candidate._id.toString() === quotedItem.itemId);
        if (!item || !procurementItemIds.has(quotedItem.itemId)) {
          throw new BadRequestException(`Invalid procurement item in canvass entry for supplier ${supplierMap.get(entry.supplierId) ?? entry.supplierId}`);
        }
        if (seenItemIds.has(quotedItem.itemId)) {
          throw new BadRequestException(`Duplicate procurement item in canvass entry for supplier ${supplierMap.get(entry.supplierId) ?? entry.supplierId}`);
        }
        seenItemIds.add(quotedItem.itemId);
        if (quotedItem.unitPrice <= 0) {
          throw new BadRequestException(`Quoted prices must be greater than zero for supplier ${supplierMap.get(entry.supplierId) ?? entry.supplierId}`);
        }

        const totalPrice = item.quantity * quotedItem.unitPrice;
        return {
          itemId: item._id,
          description: item.description,
          unitPrice: quotedItem.unitPrice,
          totalPrice,
          remarks: quotedItem.remarks?.trim() || null,
        };
      });

      const totalQuotedAmount = normalizedQuotedItems.reduce((sum, item) => sum + item.totalPrice, 0);
      return {
        supplierId: new Types.ObjectId(entry.supplierId),
        supplierName: supplierMap.get(entry.supplierId) ?? entry.supplierName,
        quotedItems: normalizedQuotedItems,
        totalQuotedAmount,
        remarks: entry.remarks?.trim() || null,
        isSelected: Boolean(entry.isSelected),
      };
    });

    const selectedEntry = normalizedEntries.find((entry) => entry.isSelected);
    if (!selectedEntry) {
      throw new BadRequestException('Select exactly one winning supplier');
    }

    for (const item of procurementItems) {
      const selectedQuote = selectedEntry.quotedItems.find(
        (quotedItem) => quotedItem.itemId.toString() === item._id.toString(),
      );
      if (!selectedQuote) {
        throw new BadRequestException(`Winning supplier is missing a quote for ${item.description}`);
      }

      item.quotedUnitPrice = selectedQuote.unitPrice;
      item.quotedAt = now;
      item.selectedSupplierId = selectedEntry.supplierId;
      item.estimatedPrice = selectedQuote.unitPrice;
      item.totalPrice = selectedQuote.totalPrice;
    }

    // Recalculate PR total from quoted + existing online prices
    pr.totalAmount = pr.items.reduce((sum, item) => sum + item.totalPrice, 0);
    pr.canvassEntries = normalizedEntries as typeof pr.canvassEntries;
    pr.canvassJustification = canvassJustification;

    // All procurement PRs go to COO for price sign-off
    pr.status = PrStatus.QUOTED;
    pr.currentApprovalLevel = 2;
    pr.set('quotationNote', null);

    pr.quotationSubmissionHistory.push({
      submittedBy: new Types.ObjectId(user._id),
      submittedAt: now,
    } as PurchaseRequest['quotationSubmissionHistory'][number]);

    await pr.save();

    this.eventEmitter.emit('pr.quoted', { purchaseRequest: pr.toJSON(), quotedBy: user._id });

    return this.prModel
      .findById(id)
      .populate('requesterId', 'firstName lastName email employeeId photoUrl')
      .populate('departmentId', 'name code')
      .exec() as Promise<PurchaseRequest>;
  }

  // Save partial canvass progress without changing PR status. Procurement
  // typically gathers quotes from suppliers over several days; this lets
  // them stash work-in-progress without satisfying every submit-time rule.
  async saveCanvassDraft(
    id: string,
    dto: SaveCanvassDraftDto,
    user: RequestUser,
  ): Promise<PurchaseRequest> {
    const pr = await this.prModel.findById(id).exec();
    if (!pr) throw new NotFoundException('Purchase request not found');

    if (!([UserRole.PROCUREMENT, UserRole.ADMIN] as string[]).includes(user.role)) {
      throw new ForbiddenException('Only Procurement can save canvass drafts');
    }

    if (pr.status !== PrStatus.PENDING_QUOTATION) {
      throw new BadRequestException('PR is not awaiting quotation');
    }

    if (pr.sourcingMode !== SourcingType.PROCUREMENT) {
      throw new BadRequestException('Only procurement-mode PRs can be canvassed');
    }

    // Single-mode PR: every item is a procurement item.
    const procurementItemIds = new Set(pr.items.map((item) => item._id.toString()));

    // Persist only entries that have a supplier picked. The UI may carry
    // empty rows for editing convenience; those don't need to round-trip.
    const liveEntries = (dto.canvassEntries ?? []).filter((entry) => !!entry.supplierId);

    const supplierIds = liveEntries.map((entry) => entry.supplierId!).filter(Boolean);
    const seenSuppliers = new Set<string>();
    for (const supplierId of supplierIds) {
      if (seenSuppliers.has(supplierId)) {
        throw new BadRequestException('Each canvass entry must use a different supplier');
      }
      seenSuppliers.add(supplierId);
    }

    let supplierMap = new Map<string, string>();
    if (supplierIds.length > 0) {
      const suppliers = await this.supplierModel
        .find({
          _id: { $in: supplierIds.map((sid) => new Types.ObjectId(sid)) },
          status: 'active',
        })
        .exec();
      if (suppliers.length !== supplierIds.length) {
        throw new BadRequestException('One or more selected suppliers are invalid or inactive');
      }
      supplierMap = new Map(suppliers.map((sup) => [sup._id.toString(), sup.companyName]));
    }

    // Build a map of existing entries by supplierId to preserve _ids
    // (attachments reference canvassEntry._id, so we must not regenerate them)
    const existingBySupplier = new Map(
      (pr.canvassEntries ?? []).map((e) => [e.supplierId.toString(), e]),
    );

    const normalizedEntries = liveEntries.map((entry) => {
      const seenItems = new Set<string>();
      const quotedItems = (entry.quotedItems ?? [])
        .filter((quoted) => procurementItemIds.has(quoted.itemId))
        .map((quoted) => {
          if (seenItems.has(quoted.itemId)) {
            throw new BadRequestException('Duplicate item in a canvass entry');
          }
          seenItems.add(quoted.itemId);
          const item = pr.items.find((candidate) => candidate._id.toString() === quoted.itemId);
          const unitPrice = quoted.unitPrice ?? 0;
          const totalPrice = item ? item.quantity * unitPrice : 0;
          return {
            itemId: item?._id ?? new Types.ObjectId(quoted.itemId),
            description: item?.description ?? quoted.description ?? '',
            unitPrice,
            totalPrice,
            remarks: quoted.remarks?.trim() || null,
          };
        });

      const existing = existingBySupplier.get(entry.supplierId!);
      return {
        ...(existing?._id ? { _id: existing._id } : {}),
        supplierId: new Types.ObjectId(entry.supplierId!),
        supplierName: supplierMap.get(entry.supplierId!) ?? entry.supplierName ?? '',
        quotedItems,
        totalQuotedAmount: quotedItems.reduce((sum, qi) => sum + qi.totalPrice, 0),
        remarks: entry.remarks?.trim() || null,
        isSelected: Boolean(entry.isSelected),
      };
    });

    pr.canvassEntries = normalizedEntries as typeof pr.canvassEntries;
    pr.canvassJustification = dto.canvassJustification?.trim() || null;
    // Status stays PENDING_QUOTATION.
    await pr.save();

    return this.prModel
      .findById(id)
      .populate('requesterId', 'firstName lastName email employeeId photoUrl')
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

    if (!([UserRole.PROCUREMENT, UserRole.ADMIN] as string[]).includes(user.role)) {
      throw new ForbiddenException('Only Procurement can return a PR for more info');
    }

    if (pr.status !== PrStatus.PENDING_QUOTATION) {
      throw new BadRequestException('PR is not awaiting quotation');
    }

    if (!note?.trim()) throw new BadRequestException('A note is required when returning for info');

    pr.status = PrStatus.RETURNED;
    pr.set('returnedAtLevel', 0); // 0 = returned by procurement (not an approval level)
    pr.set('quotationNote', note.trim());
    pr.quotationReturnHistory.push({
      note: note.trim(),
      returnedBy: new Types.ObjectId(user._id),
      returnedAt: new Date(),
      source: 'procurement',
    } as any);

    await pr.save();

    this.eventEmitter.emit('pr.returned_for_info', { purchaseRequest: pr.toJSON(), returnedBy: user._id });

    return this.prModel
      .findById(id)
      .populate('requesterId', 'firstName lastName email employeeId photoUrl')
      .populate('departmentId', 'name code')
      .exec() as Promise<PurchaseRequest>;
  }

  async replyToClarification(
    id: string,
    note: string,
    user: RequestUser,
  ): Promise<PurchaseRequest> {
    const pr = await this.prModel.findById(id).exec();

    if (!pr) throw new NotFoundException('Purchase request not found');

    if (pr.requesterId.toString() !== user._id) {
      throw new ForbiddenException('Only the requester can reply to clarification');
    }

    const hasProcurementClarification = pr.quotationReturnHistory?.some(
      (e: any) => !e.source || e.source === 'procurement',
    );
    if (!hasProcurementClarification) {
      throw new BadRequestException('No clarification request to reply to');
    }

    if (!note?.trim()) throw new BadRequestException('A reply note is required');

    if (!pr.clarificationReplies) {
      pr.set('clarificationReplies', []);
    }

    pr.clarificationReplies.push({
      note: note.trim(),
      repliedBy: new Types.ObjectId(user._id),
      repliedAt: new Date(),
    } as any);

    // Move PR back to PENDING_QUOTATION so procurement can continue
    if (pr.status === PrStatus.RETURNED) {
      pr.status = PrStatus.PENDING_QUOTATION;
    }

    await pr.save();

    this.eventEmitter.emit('pr.clarification_replied', { purchaseRequest: pr.toJSON(), repliedBy: user._id });

    return this.prModel
      .findById(id)
      .populate('requesterId', 'firstName lastName email employeeId photoUrl')
      .populate('departmentId', 'name code')
      .populate('quotationReturnHistory.returnedBy', 'firstName lastName')
      .populate('clarificationReplies.repliedBy', 'firstName lastName')
      .populate('quotationSubmissionHistory.submittedBy', 'firstName lastName')
      .exec() as Promise<PurchaseRequest>;
  }

  async updateItemSpecs(
    id: string,
    items: Array<{ itemId: string; description: string; specifications: string }>,
    user: RequestUser,
  ): Promise<PurchaseRequest> {
    const pr = await this.prModel.findById(id).exec();
    if (!pr) throw new NotFoundException('Purchase request not found');

    if (pr.requesterId.toString() !== user._id) {
      throw new ForbiddenException('Only the requester can update item details');
    }

    if (pr.status !== PrStatus.RETURNED || (pr as any).returnedAtLevel !== 0) {
      throw new BadRequestException('Item details can only be updated when the PR is returned by procurement');
    }

    for (const update of items) {
      const item = pr.items.find((i) => i._id.toString() === update.itemId);
      if (!item) continue;
      const specs = update.specifications?.trim();
      if (!specs) {
        throw new BadRequestException('Specifications are required for every item');
      }
      item.description = update.description.trim();
      item.specifications = specs;
    }

    pr.markModified('items');
    await pr.save();

    return this.prModel
      .findById(id)
      .populate('requesterId', 'firstName lastName email employeeId photoUrl')
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
      PrStatus.RETURNED,
    ];
    if (!recallableStatuses.includes(pr.status)) {
      throw new BadRequestException('Can only recall PRs that are still awaiting quotation or review');
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
      .populate('requesterId', 'firstName lastName email employeeId photoUrl')
      .populate('departmentId', 'name code')
      .populate('projectId', 'name code')
      .populate('quotationReturnHistory.returnedBy', 'firstName lastName')
      .populate('recallHistory.recalledBy', 'firstName lastName')
      .populate('quotationSubmissionHistory.submittedBy', 'firstName lastName')
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

    const cancellableStatuses: string[] = [
      PrStatus.DRAFT,
      PrStatus.SUBMITTED,
      PrStatus.LEVEL1_REVIEW,
      PrStatus.LEVEL2_REVIEW,
      PrStatus.RETURNED,
    ];
    if (!cancellableStatuses.includes(pr.status)) {
      throw new BadRequestException('Can only cancel PRs before approval work has started');
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
      .populate('requesterId', 'firstName lastName email employeeId photoUrl')
      .populate('departmentId', 'name code')
      .exec() as Promise<PurchaseRequest>;
  }

  async addAttachment(
    id: string,
    file: Express.Multer.File,
    user: RequestUser,
    category: string = AttachmentCategory.SUPPORTING_DOC,
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
      category,
      size: file.size,
      uploadedBy: user._id as unknown as import('mongoose').Types.ObjectId,
      uploadedAt: new Date(),
    } as unknown as import('./schemas/purchase-request.schema').Attachment);

    await pr.save();

    return this.prModel
      .findById(id)
      .populate('requesterId', 'firstName lastName email employeeId photoUrl')
      .populate('departmentId', 'name code')
      .exec() as Promise<PurchaseRequest>;
  }

  async addQuotationAttachment(
    id: string,
    file: Express.Multer.File,
    user: RequestUser,
    canvassEntryId: string | null = null,
  ): Promise<PurchaseRequest> {
    const pr = await this.prModel.findById(id).exec();

    if (!pr) {
      throw new NotFoundException('Purchase request not found');
    }

    if (!([UserRole.PROCUREMENT, UserRole.ADMIN] as string[]).includes(user.role)) {
      throw new ForbiddenException('Only Procurement can add quotation evidence');
    }

    if (pr.status !== PrStatus.PENDING_QUOTATION) {
      throw new BadRequestException('Can only add quotation evidence while PR is awaiting quotation');
    }

    pr.attachments.push({
      originalName: file.originalname,
      storagePath: file.path,
      mimeType: file.mimetype,
      category: AttachmentCategory.CANVASS,
      size: file.size,
      uploadedBy: user._id as unknown as import('mongoose').Types.ObjectId,
      uploadedAt: new Date(),
      canvassEntryId: canvassEntryId ? new Types.ObjectId(canvassEntryId) : null,
    } as unknown as import('./schemas/purchase-request.schema').Attachment);

    await pr.save();

    return this.prModel
      .findById(id)
      .populate('requesterId', 'firstName lastName email employeeId photoUrl')
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
      throw new BadRequestException('Can only remove attachments from PRs in Draft, Returned, or Returned for Info status');
    }

    pr.attachments = pr.attachments.filter(
      (a) => a._id.toString() !== attachmentId,
    );

    await pr.save();

    return this.prModel
      .findById(id)
      .populate('requesterId', 'firstName lastName email employeeId photoUrl')
      .populate('departmentId', 'name code')
      .exec() as Promise<PurchaseRequest>;
  }

  async removeQuotationAttachment(
    id: string,
    attachmentId: string,
    user: RequestUser,
  ): Promise<PurchaseRequest> {
    const pr = await this.prModel.findById(id).exec();

    if (!pr) {
      throw new NotFoundException('Purchase request not found');
    }

    if (!([UserRole.PROCUREMENT, UserRole.ADMIN] as string[]).includes(user.role)) {
      throw new ForbiddenException('Only Procurement can remove quotation evidence');
    }

    if (pr.status !== PrStatus.PENDING_QUOTATION) {
      throw new BadRequestException('Can only remove quotation evidence while PR is awaiting quotation');
    }

    const attachment = pr.attachments.find((a) => a._id.toString() === attachmentId);
    if (!attachment || attachment.category !== AttachmentCategory.CANVASS) {
      throw new NotFoundException('Quotation evidence not found');
    }

    pr.attachments = pr.attachments.filter((a) => a._id.toString() !== attachmentId);
    await pr.save();

    return this.prModel
      .findById(id)
      .populate('requesterId', 'firstName lastName email employeeId photoUrl')
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

    const editableStatuses: string[] = [PrStatus.DRAFT, PrStatus.RETURNED];
    if (!editableStatuses.includes(pr.status)) {
      throw new BadRequestException('Can only add photos to PRs in Draft, Returned, or Returned for Info status');
    }

    const item = pr.items.find((i) => i._id.toString() === itemId);
    if (!item) throw new NotFoundException('Line item not found');

    // Delete old photo file if it exists
    if (item.referencePhotoPath) {
      const oldPath = item.referencePhotoPath.startsWith('/')
        ? item.referencePhotoPath
        : join(process.cwd(), item.referencePhotoPath);
      if (existsSync(oldPath)) await unlink(oldPath).catch(() => null);
    }

    item.referencePhotoPath = file.path;
    item.referencePhotoOriginalName = file.originalname;

    await pr.save();

    return this.prModel
      .findById(id)
      .populate('requesterId', 'firstName lastName email employeeId photoUrl')
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

    if (item.referencePhotoPath) {
      const photoPath = item.referencePhotoPath.startsWith('/')
        ? item.referencePhotoPath
        : join(process.cwd(), item.referencePhotoPath);
      if (existsSync(photoPath)) await unlink(photoPath).catch(() => null);
    }

    item.referencePhotoPath = null;
    item.referencePhotoOriginalName = null;

    await pr.save();

    return this.prModel
      .findById(id)
      .populate('requesterId', 'firstName lastName email employeeId photoUrl')
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

  private buildVisibilityFilter(user: RequestUser): FilterQuery<PurchaseRequest> {
    const userId = new Types.ObjectId(user._id);

    if (user.role === UserRole.STAFF) {
      return { requesterId: userId };
    } else if (user.role === UserRole.DEPT_HEAD && user.departmentId) {
      return {
        $or: [
          { requesterId: userId },
          { departmentId: new Types.ObjectId(user.departmentId), status: { $ne: PrStatus.DRAFT } },
        ],
      };
    } else if (user.role === UserRole.COO) {
      return {
        $or: [
          { requesterId: userId },
          { status: { $nin: [PrStatus.DRAFT, PrStatus.LEVEL1_REVIEW] } },
        ],
      };
    } else if (user.role === UserRole.CEO) {
      return {
        $or: [
          { requesterId: userId },
          { status: { $nin: [PrStatus.DRAFT, PrStatus.LEVEL1_REVIEW, PrStatus.LEVEL2_REVIEW] } },
        ],
      };
    } else {
      // Admin, Procurement
      return {
        $or: [
          { requesterId: userId },
          { status: { $ne: PrStatus.DRAFT } },
        ],
      };
    }
  }

  async getStats(user: RequestUser) {
    const matchStage: FilterQuery<PurchaseRequest> = this.buildVisibilityFilter(user);

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
      const normalizedStatus = normalizePrStatus(s._id);
      const existing = result[normalizedStatus];
      result[normalizedStatus] = {
        count: (existing?.count ?? 0) + s.count,
        totalAmount: (existing?.totalAmount ?? 0) + s.totalAmount,
      };
    }

    const total = stats.reduce((sum, s) => sum + s.count, 0);

    return {
      total,
      byStatus: result,
    };
  }

  async getManagementStats(user: RequestUser) {
    const baseMatch: FilterQuery<PurchaseRequest> = this.buildVisibilityFilter(user);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const overdueCutoff = new Date(Date.now() - 5 * 86_400_000);

    // Only count statuses this role can actually see
    const allReviewStatuses = [
      PrStatus.LEVEL1_REVIEW, PrStatus.LEVEL2_REVIEW, PrStatus.LEVEL3_REVIEW,
      PrStatus.PENDING_QUOTATION, PrStatus.QUOTED,
    ];
    const reviewStatuses = allReviewStatuses.filter((s) => {
      if (user.role === UserRole.COO) return s !== PrStatus.LEVEL1_REVIEW;
      if (user.role === UserRole.CEO) return s !== PrStatus.LEVEL1_REVIEW && s !== PrStatus.LEVEL2_REVIEW;
      return true;
    });

    const [
      approvalTimeResult,
      monthlySpendResult,
      thisMonthRequestCount,
      overdueCount,
      highValuePendingCount,
      rejectionStats,
      spendByDepartment,
    ] = await Promise.all([
      this.prModel.aggregate([
        { $match: { ...baseMatch, status: PrStatus.APPROVED, submittedAt: { $ne: null }, completedAt: { $ne: null } } },
        { $project: { diffMs: { $subtract: ['$completedAt', '$submittedAt'] } } },
        { $group: { _id: null, avgMs: { $avg: '$diffMs' } } },
      ]),

      this.prModel.aggregate([
        { $match: { ...baseMatch, status: PrStatus.APPROVED, completedAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),

      this.prModel.countDocuments({ ...baseMatch, submittedAt: { $gte: startOfMonth } }),

      this.prModel.countDocuments({ ...baseMatch, status: { $in: reviewStatuses }, submittedAt: { $lte: overdueCutoff, $ne: null } }),

      this.prModel.countDocuments({ ...baseMatch, status: { $in: reviewStatuses }, totalAmount: { $gte: 1_000_000 } }),

      this.prModel.aggregate([
        { $match: { ...baseMatch, status: { $in: [PrStatus.APPROVED, PrStatus.REJECTED] } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      this.prModel.aggregate([
        { $match: { ...baseMatch, status: PrStatus.APPROVED } },
        { $group: { _id: '$departmentId', totalAmount: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
        { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'dept' } },
        { $unwind: '$dept' },
        { $sort: { totalAmount: -1 } },
        { $limit: 6 },
        { $project: { _id: 0, departmentId: '$_id', departmentName: '$dept.name', totalAmount: 1, count: 1 } },
      ]),
    ]);

    const avgMs = approvalTimeResult[0]?.avgMs ?? null;
    const avgApprovalDays = avgMs !== null ? Math.round((avgMs / 86_400_000) * 10) / 10 : null;

    const approvedForRate = rejectionStats.find((s: { _id: string; count: number }) => s._id === PrStatus.APPROVED)?.count ?? 0;
    const rejectedForRate = rejectionStats.find((s: { _id: string; count: number }) => s._id === PrStatus.REJECTED)?.count ?? 0;
    const rateTotal = approvedForRate + rejectedForRate;
    const rejectionRate = rateTotal > 0 ? Math.round((rejectedForRate / rateTotal) * 100) : 0;

    return {
      avgApprovalDays,
      thisMonthApprovedSpend: monthlySpendResult[0]?.total ?? 0,
      thisMonthRequestCount,
      overdueCount,
      highValuePendingCount,
      rejectionRate,
      spendByDepartment,
    };
  }

  async getProjectSpending(user: RequestUser) {
    const matchStage: FilterQuery<PurchaseRequest> = {
      projectId: { $ne: null },
    };

    if (user.role === UserRole.STAFF) {
      matchStage.requesterId = new Types.ObjectId(user._id);
    } else if (user.role === UserRole.DEPT_HEAD && user.departmentId) {
      matchStage.$or = [
        { requesterId: new Types.ObjectId(user._id) },
        { departmentId: new Types.ObjectId(user.departmentId) },
      ];
    }

    const reviewStatuses = [
      PrStatus.LEVEL1_REVIEW, PrStatus.LEVEL2_REVIEW, PrStatus.LEVEL3_REVIEW,
      PrStatus.PENDING_QUOTATION, PrStatus.QUOTED,
    ];

    const rows = await this.prModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$projectId',
          approvedAmount: {
            $sum: { $cond: [{ $eq: ['$status', PrStatus.APPROVED] }, '$totalAmount', 0] },
          },
          pendingAmount: {
            $sum: { $cond: [{ $in: ['$status', reviewStatuses] }, '$totalAmount', 0] },
          },
          totalAmount: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'projects',
          localField: '_id',
          foreignField: '_id',
          as: 'project',
        },
      },
      { $unwind: '$project' },
      { $sort: { totalAmount: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          projectId: '$_id',
          projectName: '$project.name',
          projectCode: '$project.code',
          approvedAmount: 1,
          pendingAmount: 1,
          totalAmount: 1,
          count: 1,
        },
      },
    ]);

    return rows;
  }
}
