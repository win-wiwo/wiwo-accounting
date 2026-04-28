import { AttachmentCategory } from '../constants/attachment-categories';
import { PrPriority, PrStatus, SourcingType } from '../constants/pr-status';

export interface SellerReference {
  _id?: string;
  sellerName: string;
  url?: string | null;
  price: number;
  notes?: string | null;
}

export interface CanvassQuotedItem {
  itemId: string;
  description: string;
  unitPrice: number;
  totalPrice: number;
  remarks?: string | null;
}

export interface CanvassEntry {
  _id?: string;
  supplierId: string | { _id: string; companyName: string };
  supplierName: string;
  quotedItems: CanvassQuotedItem[];
  totalQuotedAmount: number;
  remarks?: string | null;
  isSelected: boolean;
}

export interface PrLineItem {
  _id: string;
  description: string;
  quantity: number;
  unit: string;
  specifications?: string | null;
  sourcingType: SourcingType;
  estimatedPrice: number;
  totalPrice: number;
  notes?: string;
  // Optional photo reference from requester
  referencePhotoPath?: string | null;
  referencePhotoOriginalName?: string | null;
  // Online sourcing
  sellerReferences?: SellerReference[];
  sellerReferencesJustification?: string | null;
  // Filled by Procurement
  quotedUnitPrice?: number | null;
  selectedSupplierId?: string | { _id: string; companyName: string } | null;
  quotedAt?: string | null;
}

export interface PrAttachment {
  _id: string;
  originalName: string;
  storagePath: string;
  mimeType: string;
  category?: AttachmentCategory | null;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface QuotationReturn {
  _id: string;
  note: string;
  returnedBy: { _id: string; firstName: string; lastName: string } | string;
  returnedAt: string;
  source?: 'procurement' | 'coo';
}

export interface ClarificationReply {
  _id: string;
  note: string;
  repliedBy: { _id: string; firstName: string; lastName: string } | string;
  repliedAt: string;
}

export interface RecallHistoryEntry {
  _id: string;
  recalledBy: { _id: string; firstName: string; lastName: string } | string;
  recalledAt: string;
}

export interface PreviousSubmissionSnapshot {
  title: string;
  priority: string;
  justification: string;
  items: Array<{
    _id: string;
    description: string;
    quantity: number;
    unit: string;
    sourcingType: string;
    estimatedPrice: number;
  }>;
}

export interface PurchaseRequest {
  _id: string;
  prNumber: string;
  requestType: 'purchase_request' | 'job_request';
  title: string;
  projectId: { _id: string; name: string; code: string | null } | null;
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
  cancellationReason?: string | null;
  quotationNote?: string | null;
  canvassEntries?: CanvassEntry[];
  canvassJustification?: string | null;
  quotationReturnHistory?: QuotationReturn[];
  clarificationReplies?: ClarificationReply[];
  recallHistory?: RecallHistoryEntry[];
  previousSubmissionSnapshot?: PreviousSubmissionSnapshot | null;
  resubmissionNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSellerReferenceDto {
  sellerName: string;
  url?: string;
  price: number;
  notes?: string;
}

export interface CreateLineItemDto {
  description: string;
  quantity: number;
  unit: string;
  specifications?: string;
  sourcingType: SourcingType;
  estimatedPrice?: number;
  notes?: string;
  sellerReferences?: CreateSellerReferenceDto[];
  sellerReferencesJustification?: string;
}

export interface CreatePurchaseRequestDto {
  requestType?: 'purchase_request' | 'job_request';
  title: string;
  projectId?: string;
  priority: PrPriority;
  items: CreateLineItemDto[];
  justification: string;
  neededByDate?: string;
}

export interface UpdatePurchaseRequestDto {
  title?: string;
  priority?: PrPriority;
  items?: CreateLineItemDto[];
  justification?: string;
  neededByDate?: string;
  projectId?: string;
  resubmissionNote?: string;
}

export interface SubmitQuotationDto {
  canvassEntries: CanvassEntry[];
  canvassJustification?: string;
}
