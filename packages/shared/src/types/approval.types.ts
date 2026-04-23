import { ApprovalAction } from '../constants/approval-actions';

export interface ApprovalActor {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  role?: string;
}

export interface Approval {
  _id: string;
  purchaseRequestId: string;
  approverId: string;
  approvalLevel: number;
  action: ApprovalAction;
  comments: string;
  conditions?: string;
  actionDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalHistoryEntry extends Omit<Approval, 'approverId'> {
  approverId: ApprovalActor | string;
}

export interface CreateApprovalDto {
  purchaseRequestId: string;
  action: ApprovalAction;
  comments: string;
  conditions?: string;
}
