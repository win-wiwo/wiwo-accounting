export const ApprovalAction = {
  APPROVED: 'approved',
  REJECTED: 'rejected',
  RETURNED: 'returned',
} as const;

export type ApprovalAction = (typeof ApprovalAction)[keyof typeof ApprovalAction];

export const APPROVAL_ACTIONS = Object.values(ApprovalAction);

export const ApprovalLevel = {
  DEPT_HEAD: 1,
  COO: 2,
  CEO: 3,
} as const;

export type ApprovalLevel = (typeof ApprovalLevel)[keyof typeof ApprovalLevel];

export const APPROVAL_LEVEL_LABELS: Record<number, string> = {
  [ApprovalLevel.DEPT_HEAD]: 'Department Head',
  [ApprovalLevel.COO]: 'COO',
  [ApprovalLevel.CEO]: 'CEO',
};
