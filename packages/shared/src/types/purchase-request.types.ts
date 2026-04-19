import { PrPriority, PrStatus } from '../constants/pr-status';

export interface PrLineItem {
  _id: string;
  description: string;
  quantity: number;
  unit: string;
  estimatedPrice: number;
  totalPrice: number;
  notes?: string;
}

export interface PrAttachment {
  _id: string;
  originalName: string;
  storagePath: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface PurchaseRequest {
  _id: string;
  prNumber: string;
  requestType: 'purchase_request' | 'job_request';
  title: string;
  projectName: string | null;
  description: string;
  requesterId: string;
  departmentId: string;
  status: PrStatus;
  priority: PrPriority;
  items: PrLineItem[];
  totalAmount: number;
  currency: string;
  justification: string;
  neededByDate: string | null;
  attachments: PrAttachment[];
  currentApprovalLevel: number;
  approvalHistory: string[];
  submittedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePurchaseRequestDto {
  requestType?: 'purchase_request' | 'job_request';
  title: string;
  projectName?: string;
  description: string;
  priority: PrPriority;
  items: Omit<PrLineItem, '_id' | 'totalPrice'>[];
  justification: string;
  neededByDate?: string;
}

export interface UpdatePurchaseRequestDto {
  title?: string;
  description?: string;
  priority?: PrPriority;
  items?: Omit<PrLineItem, '_id' | 'totalPrice'>[];
  justification?: string;
  neededByDate?: string;
}
