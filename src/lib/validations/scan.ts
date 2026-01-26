import { z } from 'zod';

// Provider type enum - matches database CHECK constraint
export const providerSchema = z.enum([
  'gemini',
  'openai',
  'anthropic',
  'grok',
  'perplexity',
  'google_search',
]);

export type Provider = z.infer<typeof providerSchema>;

// Create scan request validation
export const createScanSchema = z.object({
  brandId: z.string().uuid('Invalid brand ID'),
  query: z.string().min(1, 'Query is required').max(500, 'Query too long'),
  providers: z
    .array(providerSchema)
    .min(1, 'At least one provider required')
    .max(6, 'Maximum 6 providers allowed'),
});

export type CreateScanInput = z.infer<typeof createScanSchema>;

// Get scans query params validation
export const getScansQuerySchema = z.object({
  brandId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  offset: z.coerce.number().int().min(0).default(0),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
});

export type GetScansQuery = z.infer<typeof getScansQuerySchema>;
