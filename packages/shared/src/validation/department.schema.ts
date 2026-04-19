import { z } from 'zod';

export const createDepartmentSchema = z.object({
  name: z.string().min(1, 'Department name is required').max(100).trim(),
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(10, 'Code must be at most 10 characters')
    .trim()
    .toUpperCase(),
  description: z.string().max(500).trim().optional().default(''),
});

export const updateDepartmentSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  code: z.string().min(2).max(10).trim().toUpperCase().optional(),
  description: z.string().max(500).trim().optional(),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
