import { z } from 'zod';

// Industry type enum
export const industrySchema = z.enum([
  'fintech',
  'ecommerce',
  'saas',
  'education',
  'healthcare',
  'fnb',
  'beauty',
  'travel',
  'realestate',
  'other',
]);

export type Industry = z.infer<typeof industrySchema>;

// Create brand request validation
export const createBrandSchema = z.object({
  name: z
    .string()
    .min(1, 'Brand name is required')
    .max(100, 'Brand name too long'),
  description: z
    .string()
    .max(500, 'Description too long')
    .optional()
    .nullable(),
  industry: industrySchema,
  keywords: z
    .array(z.string().min(1).max(50))
    .max(20, 'Maximum 20 keywords allowed')
    .default([]),
  competitors: z
    .array(z.string().min(1).max(100))
    .max(10, 'Maximum 10 competitors allowed')
    .default([]),
  isPrimary: z.boolean().default(false),
});

export type CreateBrandInput = z.infer<typeof createBrandSchema>;

// Update brand request validation
export const updateBrandSchema = createBrandSchema.partial().extend({
  id: z.string().uuid('Invalid brand ID'),
});

export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;

// Get brands query params validation
export const getBrandsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  offset: z.coerce.number().int().min(0).default(0),
  industry: industrySchema.optional(),
});

export type GetBrandsQuery = z.infer<typeof getBrandsQuerySchema>;
