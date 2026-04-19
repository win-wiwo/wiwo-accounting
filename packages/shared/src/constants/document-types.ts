export const DocumentType = {
  PURCHASE_REQUEST: 'PR',
  JOB_REQUEST: 'JR',
  PURCHASE_ORDER: 'PO',
  PETTY_CASH_PURCHASE_REQUEST: 'PCPR',
  PETTY_CASH_VOUCHER: 'PCV',
  CERR: 'CERR',
  PETTY_CASH_LIQUIDATION_REPORT: 'PCLR',
  REIMBURSEMENT_REQUEST: 'RRF',
} as const;

export type DocumentType = (typeof DocumentType)[keyof typeof DocumentType];

export const DOCUMENT_TYPES = Object.values(DocumentType);

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  [DocumentType.PURCHASE_REQUEST]: 'Purchase Request',
  [DocumentType.JOB_REQUEST]: 'Job Request',
  [DocumentType.PURCHASE_ORDER]: 'Purchase Order',
  [DocumentType.PETTY_CASH_PURCHASE_REQUEST]: 'Petty Cash Purchase Request',
  [DocumentType.PETTY_CASH_VOUCHER]: 'Petty Cash Voucher',
  [DocumentType.CERR]: 'Certificate of Expenses Not Requiring Receipts',
  [DocumentType.PETTY_CASH_LIQUIDATION_REPORT]: 'Petty Cash Liquidation Report',
  [DocumentType.REIMBURSEMENT_REQUEST]: 'Reimbursement Request Form',
};
