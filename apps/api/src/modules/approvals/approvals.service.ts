import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ApprovalAction,
  ApprovalLevel,
  PrStatus,
  UserRole,
} from '@prams/shared';
import { Approval } from './schemas/approval.schema';
import { CreateApprovalDto, QueryApprovalsDto } from './dto';
import { PurchaseRequest } from '../purchase-requests/schemas/purchase-request.schema';
import { Department } from '../departments/schemas/department.schema';

interface RequestUser {
  _id: string;
  role: string;
  departmentId: string | null;
}

/** Maps PR status to the approval level that is currently reviewing */
const STATUS_TO_LEVEL: Record<string, number> = {
  [PrStatus.SUBMITTED]: ApprovalLevel.DEPT_HEAD,
  [PrStatus.LEVEL1_REVIEW]: ApprovalLevel.DEPT_HEAD,
  [PrStatus.LEVEL2_REVIEW]: ApprovalLevel.COO,
  [PrStatus.LEVEL3_REVIEW]: ApprovalLevel.CEO,
};

/** Maps approval level to the role that can approve at that level */
const LEVEL_TO_ROLE: Record<number, string> = {
  [ApprovalLevel.DEPT_HEAD]: UserRole.DEPT_HEAD,
  [ApprovalLevel.COO]: UserRole.COO,
  [ApprovalLevel.CEO]: UserRole.CEO,
};

/** Maps current level to the next PR status after approval */
const NEXT_STATUS_AFTER_APPROVE: Record<number, PrStatus> = {
  [ApprovalLevel.DEPT_HEAD]: PrStatus.LEVEL2_REVIEW,
  [ApprovalLevel.COO]: PrStatus.LEVEL3_REVIEW,
  [ApprovalLevel.CEO]: PrStatus.APPROVED,
};

@Injectable()
export class ApprovalsService {
  constructor(
    @InjectModel(Approval.name) private approvalModel: Model<Approval>,
    @InjectModel(PurchaseRequest.name) private prModel: Model<PurchaseRequest>,
    @InjectModel(Department.name) private departmentModel: Model<Department>,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Process an approval action (approve, reject, or return).
   */
  async processAction(dto: CreateApprovalDto, user: RequestUser): Promise<Approval> {
    const pr = await this.prModel.findById(dto.purchaseRequestId).exec();
    if (!pr) {
      throw new NotFoundException('Purchase request not found');
    }

    // Determine what level this PR is currently at
    const currentLevel = STATUS_TO_LEVEL[pr.status];
    if (!currentLevel) {
      throw new BadRequestException(
        `This PR is not pending approval (status: ${pr.status})`,
      );
    }

    // Validate the user has the right role for this level
    const requiredRole = LEVEL_TO_ROLE[currentLevel];
    if (user.role !== requiredRole) {
      throw new ForbiddenException(
        `Only ${requiredRole} can act on PRs at approval level ${currentLevel}`,
      );
    }

    // Dept heads can only approve PRs from their own department
    if (currentLevel === ApprovalLevel.DEPT_HEAD) {
      const dept = await this.departmentModel.findOne({ headId: new Types.ObjectId(user._id) }).exec();
      if (!dept || dept._id.toString() !== pr.departmentId.toString()) {
        throw new ForbiddenException(
          'You can only approve PRs from your own department',
        );
      }
    }

    // Approvers cannot approve their own PRs
    if (pr.requesterId.toString() === user._id) {
      throw new ForbiddenException('You cannot approve your own purchase request');
    }

    // Require comments for reject/return
    if (
      (dto.action === ApprovalAction.REJECTED || dto.action === ApprovalAction.RETURNED) &&
      (!dto.comments || dto.comments.trim().length === 0)
    ) {
      throw new BadRequestException('Comments are required when rejecting or returning a PR');
    }

    // Create the approval record
    const approval = new this.approvalModel({
      purchaseRequestId: pr._id,
      approverId: user._id,
      approvalLevel: currentLevel,
      action: dto.action,
      comments: dto.comments || '',
      conditions: dto.conditions || null,
      actionDate: new Date(),
    });

    await approval.save();

    // Transition the PR status
    if (dto.action === ApprovalAction.APPROVED) {
      const nextStatus = NEXT_STATUS_AFTER_APPROVE[currentLevel];
      pr.status = nextStatus;
      pr.currentApprovalLevel = currentLevel + 1;

      if (nextStatus === PrStatus.APPROVED) {
        pr.completedAt = new Date();
      }
    } else if (dto.action === ApprovalAction.REJECTED) {
      pr.status = PrStatus.REJECTED;
      pr.completedAt = new Date();
    } else if (dto.action === ApprovalAction.RETURNED) {
      pr.status = PrStatus.RETURNED;
      pr.currentApprovalLevel = 0;
    }

    pr.approvalHistory.push(approval._id);
    await pr.save();

    // Emit event for notifications
    this.eventEmitter.emit('approval.action', {
      approval: approval.toJSON(),
      purchaseRequest: pr.toJSON(),
      action: dto.action,
      actorId: user._id,
    });

    return approval.populate('approverId', 'firstName lastName email role');
  }

  /**
   * Get the approval history for a specific PR.
   */
  async getByPurchaseRequest(prId: string): Promise<Approval[]> {
    return this.approvalModel
      .find({ purchaseRequestId: prId })
      .populate('approverId', 'firstName lastName email role')
      .sort({ actionDate: 1 })
      .exec();
  }

  /**
   * Get PRs pending the current user's approval.
   */
  async getPendingForUser(user: RequestUser, query: QueryApprovalsDto) {
    const { page = 1, limit = 10 } = query;

    // Determine which status to filter by based on the user's role
    let pendingStatus: string;
    switch (user.role) {
      case UserRole.DEPT_HEAD:
        pendingStatus = PrStatus.SUBMITTED;
        break;
      case UserRole.COO:
        pendingStatus = PrStatus.LEVEL2_REVIEW;
        break;
      case UserRole.CEO:
        pendingStatus = PrStatus.LEVEL3_REVIEW;
        break;
      default:
        return { data: [], meta: { total: 0, page: Number(page), limit: Number(limit), totalPages: 0 } };
    }

    const filter: FilterQuery<PurchaseRequest> = { status: pendingStatus };

    // Dept head can only see PRs from their department
    if (user.role === UserRole.DEPT_HEAD) {
      const userId = new Types.ObjectId(user._id);
      const dept = await this.departmentModel.findOne({ headId: userId }).exec();
      if (dept) {
        filter.departmentId = dept._id;
      } else {
        return { data: [], meta: { total: 0, page: Number(page), limit: Number(limit), totalPages: 0 } };
      }
    }

    // Exclude PRs created by the approver themselves
    filter.requesterId = { $ne: new Types.ObjectId(user._id) };

    const skip = (Number(page) - 1) * Number(limit);

    const [prs, total] = await Promise.all([
      this.prModel
        .find(filter)
        .populate('requesterId', 'firstName lastName email employeeId')
        .populate('departmentId', 'name code')
        .sort({ submittedAt: 1 }) // FIFO — oldest first
        .skip(skip)
        .limit(Number(limit))
        .exec(),
      this.prModel.countDocuments(filter),
    ]);

    return {
      data: prs,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  }

  /**
   * Count of PRs pending the current user's approval.
   */
  async getPendingCount(user: RequestUser): Promise<number> {
    let pendingStatus: string;
    switch (user.role) {
      case UserRole.DEPT_HEAD:
        pendingStatus = PrStatus.SUBMITTED;
        break;
      case UserRole.COO:
        pendingStatus = PrStatus.LEVEL2_REVIEW;
        break;
      case UserRole.CEO:
        pendingStatus = PrStatus.LEVEL3_REVIEW;
        break;
      default:
        return 0;
    }

    const filter: FilterQuery<PurchaseRequest> = {
      status: pendingStatus,
      requesterId: { $ne: new Types.ObjectId(user._id) },
    };

    if (user.role === UserRole.DEPT_HEAD) {
      const dept = await this.departmentModel.findOne({ headId: new Types.ObjectId(user._id) }).exec();
      if (dept) {
        filter.departmentId = dept._id;
      } else {
        return 0;
      }
    }

    return this.prModel.countDocuments(filter);
  }
}
