import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ApprovalAction,
  APPROVAL_LEVEL_LABELS,
  PrStatus,
  UserRole,
} from '@prams/shared';
import { Notification } from './schemas/notification.schema';
import { PurchaseRequest } from '../purchase-requests/schemas/purchase-request.schema';
import { Department } from '../departments/schemas/department.schema';
import { QueryNotificationsDto } from './dto';
import { User } from '../users/schemas/user.schema';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<Notification>,
    @InjectModel(PurchaseRequest.name) private prModel: Model<PurchaseRequest>,
    @InjectModel(Department.name) private departmentModel: Model<Department>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  /**
   * Listen for approval actions and create notifications for relevant users.
   */
  @OnEvent('approval.action')
  async handleApprovalAction(payload: {
    approval: { action: string; approvalLevel: number; comments: string };
    purchaseRequest: { _id: string; title: string; prNumber: string; requesterId: string; departmentId: string; status: string };
    actorId: string;
  }) {
    const { approval, purchaseRequest, actorId } = payload;
    const levelLabel = APPROVAL_LEVEL_LABELS[approval.approvalLevel] || `Level ${approval.approvalLevel}`;

    // Notify the requester about the action on their PR
    if (purchaseRequest.requesterId.toString() !== actorId) {
      const typeMap: Record<string, string> = {
        [ApprovalAction.APPROVED]: 'approval_approved',
        [ApprovalAction.REJECTED]: 'approval_rejected',
        [ApprovalAction.RETURNED]: 'approval_returned',
      };

      const titleMap: Record<string, string> = {
        [ApprovalAction.APPROVED]: `PR ${approval.approvalLevel === 3 ? 'Fully Approved' : 'Approved'} by ${levelLabel}`,
        [ApprovalAction.REJECTED]: `PR Rejected by ${levelLabel}`,
        [ApprovalAction.RETURNED]: `PR Returned by ${levelLabel}`,
      };

      const messageMap: Record<string, string> = {
        [ApprovalAction.APPROVED]: approval.approvalLevel === 3
          ? `Your PR "${purchaseRequest.prNumber}" has been fully approved.`
          : `Your PR "${purchaseRequest.prNumber}" was approved by ${levelLabel} and advanced to the next level.`,
        [ApprovalAction.REJECTED]: `Your PR "${purchaseRequest.prNumber}" was rejected by ${levelLabel}.${approval.comments ? ` Reason: ${approval.comments}` : ''}`,
        [ApprovalAction.RETURNED]: `Your PR "${purchaseRequest.prNumber}" was returned for revision by ${levelLabel}.${approval.comments ? ` Reason: ${approval.comments}` : ''}`,
      };

      await this.notificationModel.create({
        recipientId: purchaseRequest.requesterId,
        title: titleMap[approval.action] || 'PR Update',
        message: messageMap[approval.action] || 'Your purchase request has been updated.',
        type: typeMap[approval.action] || 'system',
        purchaseRequestId: purchaseRequest._id,
      });
    }

    // If approved and moving to next level, notify the next approver
    if (approval.action === ApprovalAction.APPROVED && purchaseRequest.status !== PrStatus.APPROVED) {
      await this.notifyNextApprover(purchaseRequest);
    }
  }

  /**
   * Listen for PR submissions and notify the first-level approver (dept head).
   */
  @OnEvent('pr.submitted')
  async handlePrSubmitted(payload: { purchaseRequest: { _id: string; title: string; prNumber: string; departmentId: string; status: string } }) {
    const { purchaseRequest } = payload;
    await this.notifyNextApprover(purchaseRequest);
  }

  private async notifyNextApprover(pr: { _id: string; title: string; prNumber: string; departmentId: string; status: string }) {
    // Determine who to notify based on current status
    if (
      pr.status === PrStatus.SUBMITTED ||
      pr.status === PrStatus.LEVEL1_REVIEW ||
      pr.status === PrStatus.QUOTED
    ) {
      // Notify dept head
      const dept = await this.departmentModel.findById(pr.departmentId).exec();
      if (dept?.headId) {
        await this.notificationModel.create({
          recipientId: dept.headId,
          title: 'New PR Awaiting Your Approval',
          message: `PR "${pr.prNumber}" requires your review as Department Head.`,
          type: 'pr_needs_action',
          purchaseRequestId: pr._id,
        });
      }
      return;
    }

    if (pr.status === PrStatus.PENDING_QUOTATION) {
      const procurementUsers = await this.userModel
        .find({ role: UserRole.PROCUREMENT, isActive: true })
        .select('_id')
        .exec();

      if (procurementUsers.length > 0) {
        await this.notificationModel.insertMany(
          procurementUsers.map((user) => ({
            recipientId: user._id,
            title: 'PR Awaiting Quotation',
            message: `PR "${pr.prNumber}" requires procurement quotation.`,
            type: 'pr_needs_action',
            purchaseRequestId: pr._id,
          })),
        );
      }
      return;
    }

    if (pr.status === PrStatus.LEVEL2_REVIEW || pr.status === PrStatus.LEVEL3_REVIEW) {
      const nextRole = pr.status === PrStatus.LEVEL2_REVIEW ? UserRole.COO : UserRole.CEO;
      const approvers = await this.userModel
        .find({ role: nextRole, isActive: true })
        .select('_id')
        .exec();

      if (approvers.length > 0) {
        const roleLabel = nextRole === UserRole.COO ? 'COO' : 'CEO';
        await this.notificationModel.insertMany(
          approvers.map((user) => ({
            recipientId: user._id,
            title: `PR Awaiting ${roleLabel} Approval`,
            message: `PR "${pr.prNumber}" requires your review.`,
            type: 'pr_needs_action',
            purchaseRequestId: pr._id,
          })),
        );
      }
    }
  }

  /**
   * Get notifications for a user.
   */
  async findForUser(userId: string, query: QueryNotificationsDto) {
    const { page = 1, limit = 20, unreadOnly } = query;

    const filter: FilterQuery<Notification> = { recipientId: userId };
    if (unreadOnly) {
      filter.isRead = false;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [notifications, total] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .exec(),
      this.notificationModel.countDocuments(filter),
    ]);

    return {
      data: notifications,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  }

  /**
   * Get unread count for a user.
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({ recipientId: userId, isRead: false });
  }

  /**
   * Mark a single notification as read.
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.notificationModel.updateOne(
      { _id: notificationId, recipientId: userId },
      { $set: { isRead: true, readAt: new Date() } },
    );
  }

  /**
   * Mark all notifications as read for a user.
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationModel.updateMany(
      { recipientId: userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } },
    );
  }
}
