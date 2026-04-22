export const PrStatus = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  PENDING_QUOTATION: 'pending_quotation',
  QUOTED: 'quoted',
  LEVEL1_REVIEW: 'level1_review',
  LEVEL2_REVIEW: 'level2_review',
  LEVEL3_REVIEW: 'level3_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  RETURNED: 'returned',
  RETURNED_FOR_INFO: 'returned_for_info',
  CANCELLED: 'cancelled',
} as const;

export type PrStatus = (typeof PrStatus)[keyof typeof PrStatus];

export const PR_STATUSES = Object.values(PrStatus);

export const PR_STATUS_LABELS: Record<PrStatus, string> = {
  [PrStatus.DRAFT]: 'Draft',
  [PrStatus.SUBMITTED]: 'Submitted',
  [PrStatus.PENDING_QUOTATION]: 'Pending Quotation',
  [PrStatus.QUOTED]: 'Quoted',
  [PrStatus.LEVEL1_REVIEW]: 'Dept Head Review',
  [PrStatus.LEVEL2_REVIEW]: 'COO Review',
  [PrStatus.LEVEL3_REVIEW]: 'CEO Review',
  [PrStatus.APPROVED]: 'Approved',
  [PrStatus.REJECTED]: 'Rejected',
  [PrStatus.RETURNED]: 'Returned',
  [PrStatus.RETURNED_FOR_INFO]: 'Returned for Info',
  [PrStatus.CANCELLED]: 'Cancelled',
};

export const PrPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export type PrPriority = (typeof PrPriority)[keyof typeof PrPriority];

export const PR_PRIORITIES = Object.values(PrPriority);

export const PR_PRIORITY_LABELS: Record<PrPriority, string> = {
  [PrPriority.LOW]: 'Low',
  [PrPriority.MEDIUM]: 'Medium',
  [PrPriority.HIGH]: 'High',
  [PrPriority.URGENT]: 'Urgent',
};

export const SourcingType = {
  PROCUREMENT: 'procurement',
  ONLINE: 'online',
} as const;

export type SourcingType = (typeof SourcingType)[keyof typeof SourcingType];
