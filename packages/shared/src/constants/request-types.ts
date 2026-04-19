export const RequestType = {
  PURCHASE_REQUEST: 'purchase_request',
  JOB_REQUEST: 'job_request',
  PETTY_CASH_REQUEST: 'petty_cash_request',
  PURCHASE_ORDER: 'purchase_order',
  REIMBURSEMENT: 'reimbursement',
} as const;

export type RequestType = (typeof RequestType)[keyof typeof RequestType];

export const REQUEST_TYPES = Object.values(RequestType);

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  [RequestType.PURCHASE_REQUEST]: 'Purchase Request',
  [RequestType.JOB_REQUEST]: 'Job Request',
  [RequestType.PETTY_CASH_REQUEST]: 'Petty Cash Purchase Request',
  [RequestType.PURCHASE_ORDER]: 'Purchase Order',
  [RequestType.REIMBURSEMENT]: 'Reimbursement Request',
};

export const REQUEST_TYPE_CODES: Record<RequestType, string> = {
  [RequestType.PURCHASE_REQUEST]: 'PR',
  [RequestType.JOB_REQUEST]: 'JR',
  [RequestType.PETTY_CASH_REQUEST]: 'PCPR',
  [RequestType.PURCHASE_ORDER]: 'PO',
  [RequestType.REIMBURSEMENT]: 'RRF',
};
