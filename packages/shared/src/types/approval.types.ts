import { ApprovalAction } from '../constants/approval-actions';

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

export interface CreateApprovalDto {
  purchaseRequestId: string;
  action: ApprovalAction;
  comments: string;
  conditions?: string;
}
