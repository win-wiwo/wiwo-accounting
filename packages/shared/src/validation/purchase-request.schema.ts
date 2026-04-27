import { z } from 'zod';
import { PR_PRIORITIES } from '../constants/pr-status';

export const lineItemSchema = z.object({
  description: z.string().min(1, 'Item description is required').max(200).trim(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  unit: z.string().min(1, 'Unit is required').max(20).trim(),
  estimatedPrice: z.number().min(0, 'Price must be non-negative'),
  notes: z.string().max(500).trim().optional(),
});

const futureDateString = z.string().datetime().refine(
  (val) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(val) >= today;
  },
  { message: 'Required date cannot be in the past' },
);

export const createPurchaseRequestSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).trim(),
  priority: z.enum(PR_PRIORITIES as [string, ...string[]]),
  items: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  justification: z.string().min(1, 'Purpose is required').max(2000).trim(),
  neededByDate: futureDateString.optional(),
});

export const updatePurchaseRequestSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  priority: z.enum(PR_PRIORITIES as [string, ...string[]]).optional(),
  items: z.array(lineItemSchema).min(1).optional(),
  justification: z.string().min(1).max(2000).trim().optional(),
  neededByDate: futureDateString.optional(),
});

export type LineItemInput = z.infer<typeof lineItemSchema>;
export type CreatePurchaseRequestInput = z.infer<typeof createPurchaseRequestSchema>;
export type UpdatePurchaseRequestInput = z.infer<typeof updatePurchaseRequestSchema>;
