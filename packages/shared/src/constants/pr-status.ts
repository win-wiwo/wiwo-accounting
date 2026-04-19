export const PrStatus = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  LEVEL1_REVIEW: 'level1_review',
  LEVEL2_REVIEW: 'level2_review',
  LEVEL3_REVIEW: 'level3_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  RETURNED: 'returned',
  CANCELLED: 'cancelled',
} as const;

export type PrStatus = (typeof PrStatus)[keyof typeof PrStatus];

export const PR_STATUSES = Object.values(PrStatus);

export const PR_STATUS_LABELS: Record<PrStatus, string> = {
  [PrStatus.DRAFT]: 'Draft',
  [PrStatus.SUBMITTED]: 'Submitted',
  [PrStatus.LEVEL1_REVIEW]: 'Dept Head Review',
  [PrStatus.LEVEL2_REVIEW]: 'COO Review',
  [PrStatus.LEVEL3_REVIEW]: 'CEO Review',
  [PrStatus.APPROVED]: 'Approved',
  [PrStatus.REJECTED]: 'Rejected',
  [PrStatus.RETURNED]: 'Returned',
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
