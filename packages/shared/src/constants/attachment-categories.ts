export const AttachmentCategory = {
  CANVASS: 'canvass',
  ITEM_PHOTO: 'item_photo',
  TECHNICAL_SPEC: 'technical_spec',
  SERVICE_INSPECTION: 'service_inspection',
  RECEIPT_INVOICE: 'receipt_invoice',
  BIR_FORM: 'bir_form',
  SUPPLIER_PROOF: 'supplier_proof',
  CERR: 'cerr',
  SUPPORTING_DOC: 'supporting_doc',
  OTHER: 'other',
} as const;

export type AttachmentCategory = (typeof AttachmentCategory)[keyof typeof AttachmentCategory];

export const ATTACHMENT_CATEGORIES = Object.values(AttachmentCategory);

export const ATTACHMENT_CATEGORY_LABELS: Record<AttachmentCategory, string> = {
  [AttachmentCategory.CANVASS]: 'Canvass / Price Quote',
  [AttachmentCategory.ITEM_PHOTO]: 'Item Photo / Screenshot',
  [AttachmentCategory.TECHNICAL_SPEC]: 'Technical Specification',
  [AttachmentCategory.SERVICE_INSPECTION]: 'Service Inspection Report',
  [AttachmentCategory.RECEIPT_INVOICE]: 'Sales / Service Invoice (BIR Registered)',
  [AttachmentCategory.BIR_FORM]: 'BIR Form 2303 / COR',
  [AttachmentCategory.SUPPLIER_PROOF]: 'Supplier Proof of Account',
  [AttachmentCategory.CERR]: 'Certificate of Expenses Not Requiring Receipts',
  [AttachmentCategory.SUPPORTING_DOC]: 'Supporting Document',
  [AttachmentCategory.OTHER]: 'Other',
};
