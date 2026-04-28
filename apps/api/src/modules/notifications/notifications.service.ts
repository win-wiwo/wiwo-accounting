import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import { OnEvent } from '@nestjs/event-emitter';
import { Subject, Observable } from 'rxjs';
import {
  ApprovalAction,
  APPROVAL_LEVEL_LABELS,
  normalizePrStatus,
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
  private readonly logger = new Logger(NotificationsService.name);
  // One Subject per connected user — SSE streams subscribe to these
  private clients = new Map<string, Subject<{ data: unknown }>>();

  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<Notification>,
    @InjectModel(PurchaseRequest.name) private prModel: Model<PurchaseRequest>,
    @InjectModel(Department.name) private departmentModel: Model<Department>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  /**
   * Register an SSE client for a user. Returns an Observable that the @Sse
   * controller method will pipe to the browser as an event stream.
   */
  registerClient(userId: string): Observable<{ data: unknown }> {
    // If the user already has an open stream (e.g. duplicate tab), reuse it
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Subject<{ data: unknown }>());
    }
    return this.clients.get(userId)!.asObservable();
  }

  /**
   * Remove a client when the SSE connection closes.
   */
  removeClient(userId: string): void {
    const subject = this.clients.get(userId);
    if (subject) {
      subject.complete();
      this.clients.delete(userId);
    }
  }

  /**
   * Push a notification event to a connected client (if any).
   */
  private push(userId: string, data: unknown): void {
    this.clients.get(userId.toString())?.next({ data });
  }

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

      const isMovingToProcurement = approval.action === ApprovalAction.APPROVED && purchaseRequest.status === PrStatus.PENDING_QUOTATION;
      const isFullyApproved = purchaseRequest.status === PrStatus.APPROVED || purchaseRequest.status === PrStatus.COMPLETED;

      const titleMap: Record<string, string> = {
        [ApprovalAction.APPROVED]: isFullyApproved
          ? `PR Fully Approved`
          : isMovingToProcurement
            ? `PR Approved — Moving to Procurement`
            : `PR Approved by ${levelLabel}`,
        [ApprovalAction.REJECTED]: `PR Rejected by ${levelLabel}`,
        [ApprovalAction.RETURNED]: `PR Returned by ${levelLabel}`,
      };

      const messageMap: Record<string, string> = {
        [ApprovalAction.APPROVED]: isFullyApproved
          ? `Your PR "${purchaseRequest.prNumber}" has been fully approved.`
          : isMovingToProcurement
            ? `Your PR "${purchaseRequest.prNumber}" has been approved and is now awaiting procurement sourcing.`
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
      this.push(purchaseRequest.requesterId, { type: 'notification' });
    }

    // If approved and moving to next level (or to procurement), notify the next actor
    if (approval.action === ApprovalAction.APPROVED && purchaseRequest.status !== PrStatus.APPROVED && purchaseRequest.status !== PrStatus.COMPLETED) {
      await this.notifyNextApprover(purchaseRequest);
    }

    // If returned from QUOTED, notify procurement that price review was returned
    if (approval.action === ApprovalAction.RETURNED && purchaseRequest.status === PrStatus.PENDING_QUOTATION) {
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

  /**
   * Notify the requester when procurement returns their PR for more information.
   */
  @OnEvent('pr.returned_for_info')
  async handleReturnedForInfo(payload: { purchaseRequest: { _id: string; prNumber: string; requesterId: string }; returnedBy: string }) {
    const { purchaseRequest } = payload;
    await this.notificationModel.create({
      recipientId: purchaseRequest.requesterId,
      title: 'More Information Needed',
      message: `Procurement needs additional information on PR "${purchaseRequest.prNumber}" before it can be canvassed.`,
      type: 'pr_needs_action',
      purchaseRequestId: purchaseRequest._id,
    });
    this.push(purchaseRequest.requesterId, { type: 'notification' });
  }

  /**
   * Notify procurement officers when requester replies to a clarification request.
   */
  @OnEvent('pr.clarification_replied')
  async handleClarificationReplied(payload: { purchaseRequest: { _id: string; prNumber: string }; repliedBy: string }) {
    const { purchaseRequest } = payload;
    const procurementUsers = await this.userModel
      .find({ role: UserRole.PROCUREMENT, isActive: true })
      .select('_id')
      .exec();

    if (procurementUsers.length > 0) {
      await this.notificationModel.insertMany(
        procurementUsers.map((user) => ({
          recipientId: user._id,
          title: 'Clarification Received',
          message: `The requester has replied to your clarification request on PR "${purchaseRequest.prNumber}".`,
          type: 'pr_needs_action',
          purchaseRequestId: purchaseRequest._id,
        })),
      );
      procurementUsers.forEach((u) => this.push(u._id.toString(), { type: 'notification' }));
    }
  }

  /**
   * Notify the requester when procurement submits the canvass (PR moves to Quoted or Level 2).
   */
  @OnEvent('pr.quoted')
  async handleQuoted(payload: { purchaseRequest: { _id: string; prNumber: string; requesterId: string; status: string; title: string; departmentId: string }; quotedBy: string }) {
    const { purchaseRequest } = payload;

    // Notify requester that quotation was submitted
    await this.notificationModel.create({
      recipientId: purchaseRequest.requesterId,
      title: 'Quotation Submitted',
      message: `Procurement has submitted a canvass for PR "${purchaseRequest.prNumber}". It is now pending COO price review.`,
      type: 'approval_approved',
      purchaseRequestId: purchaseRequest._id,
    });

    this.push(purchaseRequest.requesterId, { type: 'notification' });

    // Notify COO for price sign-off
    await this.notifyNextApprover(purchaseRequest);
  }

  /**
   * Notify the PR creator when their purchase order has been received.
   */
  @OnEvent('purchase-order.received')
  async handlePoReceived(payload: {
    purchaseOrder: { _id: string; poNumber: string };
    purchaseRequestId: string;
    prNumber: string | null;
    requesterId: string | null;
  }) {
    const { purchaseOrder, purchaseRequestId, prNumber, requesterId } = payload;
    if (!requesterId) return;

    await this.notificationModel.create({
      recipientId: new Types.ObjectId(requesterId),
      title: 'Order Received',
      message: `Your purchase order ${purchaseOrder.poNumber}${prNumber ? ` (PR ${prNumber})` : ''} has been received by procurement.`,
      type: 'po_received',
      purchaseRequestId: new Types.ObjectId(purchaseRequestId),
    });
    this.push(requesterId, { type: 'notification' });
  }

  private async notifyNextApprover(pr: { _id: string; title: string; prNumber: string; departmentId: string; status: string }) {
    const normalizedStatus = normalizePrStatus(pr.status);

    // Determine who to notify based on current status
    if (normalizedStatus === PrStatus.LEVEL1_REVIEW) {
      const dept = await this.departmentModel.findById(pr.departmentId).exec();
      if (dept?.headId) {
        await this.notificationModel.create({
          recipientId: dept.headId,
          title: 'New PR Awaiting Your Approval',
          message: `PR "${pr.prNumber}" requires your review as Department Head.`,
          type: 'pr_needs_action',
          purchaseRequestId: pr._id,
        });
        this.push(dept.headId.toString(), { type: 'notification' });
      }
      return;
    }

    if (normalizedStatus === PrStatus.QUOTED) {
      const cooUsers = await this.userModel
        .find({ role: UserRole.COO, isActive: true })
        .select('_id')
        .exec();
      if (cooUsers.length > 0) {
        await this.notificationModel.insertMany(
          cooUsers.map((user) => ({
            recipientId: user._id,
            title: 'PR Price Review Required',
            message: `PR "${pr.prNumber}" has been quoted by procurement and requires your price review.`,
            type: 'pr_needs_action',
            purchaseRequestId: pr._id,
          })),
        );
        cooUsers.forEach((u) => this.push(u._id.toString(), { type: 'notification' }));
      }
      return;
    }

    if (normalizedStatus === PrStatus.PENDING_QUOTATION) {
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
        procurementUsers.forEach((u) => this.push(u._id.toString(), { type: 'notification' }));
      }
      return;
    }

    if (normalizedStatus === PrStatus.LEVEL2_REVIEW || normalizedStatus === PrStatus.LEVEL3_REVIEW) {
      const nextRole = normalizedStatus === PrStatus.LEVEL2_REVIEW ? UserRole.COO : UserRole.CEO;
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
        approvers.forEach((u) => this.push(u._id.toString(), { type: 'notification' }));
      }
    }
  }

  /**
   * Get notifications for a user.
   */
  async findForUser(userId: string, query: QueryNotificationsDto) {
    const { page = 1, limit = 20, unreadOnly } = query;

    const filter: FilterQuery<Notification> = { recipientId: new Types.ObjectId(userId) };
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
    return this.notificationModel.countDocuments({ recipientId: new Types.ObjectId(userId), isRead: false });
  }

  /**
   * Mark a single notification as read.
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.notificationModel.updateOne(
      { _id: notificationId, recipientId: new Types.ObjectId(userId) },
      { $set: { isRead: true, readAt: new Date() } },
    );
  }

  /**
   * Mark all notifications as read for a user.
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationModel.updateMany(
      { recipientId: new Types.ObjectId(userId), isRead: false },
      { $set: { isRead: true, readAt: new Date() } },
    );
  }
}
