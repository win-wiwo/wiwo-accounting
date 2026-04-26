import { z } from 'zod';
import { PR_PRIORITIES, PrPriority, SourcingType } from '@prams/shared';

// ─── Schemas ────────────────────────────────────────────────────────────────

export const sellerReferenceSchema = z.object({
  sellerName: z.string().min(1, 'Seller name required').max(100),
  price: z.number({ coerce: true }).min(0, 'Price required'),
  notes: z.string().max(500).optional(),
});

export const lineItemSchema = z.object({
  _id: z.string().optional(),
  description: z.string().min(1, 'Required'),
  quantity: z.number({ coerce: true }).int().min(1, 'Min 1'),
  unit: z.string().min(1, 'Required'),
  specifications: z.string().min(1, 'Specifications required').max(1000),
  sourcingType: z.enum([SourcingType.PROCUREMENT, SourcingType.ONLINE]),
  estimatedPrice: z.number({ coerce: true }).min(0).optional(),
  sellerReferences: z.array(sellerReferenceSchema).max(3).optional(),
  sellerReferencesJustification: z.string().max(500).optional(),
}).superRefine((item, ctx) => {
  if (item.sourcingType === SourcingType.ONLINE) {
    if (!item.estimatedPrice || item.estimatedPrice <= 0) {
      ctx.addIssue({ code: 'custom', path: ['estimatedPrice'], message: 'Price required for online-sourced items' });
    }
    const refs = item.sellerReferences ?? [];
    if (refs.length < 3 && !item.sellerReferencesJustification?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['sellerReferencesJustification'],
        message: `Justify why only ${refs.length} seller${refs.length === 1 ? '' : 's'} provided (3 required)`,
      });
    }
  }
});

export const formSchema = z.object({
  requestType: z.enum(['purchase_request', 'job_request']).default('purchase_request'),
  assignmentType: z.enum(['project', 'office']).default('project'),
  title: z.string().min(1, 'Title is required').max(200),
  projectId: z.string().optional(),
  priority: z.enum(PR_PRIORITIES as [PrPriority, ...PrPriority[]]),
  justification: z.string().min(1, 'Required').max(2000),
  neededByDate: z.string().optional(),
  items: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  resubmissionNote: z.string().max(1000).optional(),
  _isReturned: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (data.assignmentType === 'project' && !data.projectId) {
    ctx.addIssue({
      code: 'custom',
      path: ['projectId'],
      message: 'Select a project, or switch to "Office / General" assignment.',
    });
  }
  if (data._isReturned && !data.resubmissionNote?.trim()) {
    ctx.addIssue({
      code: 'custom',
      path: ['resubmissionNote'],
      message: 'Please describe what you changed before resubmitting.',
    });
  }
});

export type FormData = z.infer<typeof formSchema>;
export type LineItemForm = z.infer<typeof lineItemSchema>;
export type ProjectOption = { _id: string; name: string; code: string | null };

export const defaultItem = (): LineItemForm => ({
  description: '',
  quantity: 1,
  unit: 'pcs',
  specifications: '',
  sourcingType: SourcingType.PROCUREMENT,
  estimatedPrice: 0,
  sellerReferences: [],
  sellerReferencesJustification: '',
});

// Field groups for per-step validation
export const STEP_FIELDS = {
  0: ['requestType', 'title', 'justification', 'assignmentType', 'projectId', 'priority', 'neededByDate'] as const,
  1: ['items'] as const,
  2: ['resubmissionNote'] as const,
};

export const STEP_LABELS = ['Basics', 'Items', 'Review'] as const;
