import { PrPriority, PrStatus, SourcingType } from '../constants/pr-status';

export interface SellerReference {
  _id?: string;
  sellerName: string;
  url?: string | null;
  price: number;
  notes?: string | null;
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
  // Online sourcing
  sellerReferences?: SellerReference[];
  sellerReferencesJustification?: string | null;
  // Filled by Procurement
  quotedUnitPrice?: number | null;
  selectedSupplierId?: string | null;
  quotedAt?: string | null;
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

export interface QuotationReturn {
  _id: string;
  note: string;
  returnedBy: { _id: string; firstName: string; lastName: string } | string;
  returnedAt: string;
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
  quotationNote?: string | null;
  quotationReturnHistory?: QuotationReturn[];
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
  description: string;
  priority: PrPriority;
  items: CreateLineItemDto[];
  justification: string;
  neededByDate?: string;
}

export interface UpdatePurchaseRequestDto {
  title?: string;
  description?: string;
  priority?: PrPriority;
  items?: CreateLineItemDto[];
  justification?: string;
  neededByDate?: string;
  projectId?: string;
}

export interface SubmitQuotationDto {
  items: Array<{
    itemId: string;
    quotedUnitPrice: number;
    selectedSupplierId?: string;
  }>;
}
