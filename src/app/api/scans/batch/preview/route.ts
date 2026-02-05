import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ProviderType } from '@/types/database';
import { expandQueries, type ExpansionLevel } from '@/services/query-expansion';
import {
  UnauthorizedError,
  NotFoundError,
  errorResponse,
} from '@/lib/errors';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Validation schema
const previewBatchScanSchema = z.object({
  brandId: z.string().uuid(),
  baseQuery: z.string().min(2).max(500),
  expansionLevel: z.enum(['minimal', 'standard', 'comprehensive']).default('standard'),
  providers: z.array(z.enum(['gemini', 'openai', 'anthropic', 'grok', 'perplexity', 'google_search'])).min(1).max(6),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    // Validate request body
    const body = await request.json();
    const validatedBody = previewBatchScanSchema.parse(body);
    const { brandId, baseQuery, expansionLevel, providers } = validatedBody;

    // Verify brand ownership and get brand info
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id, user_id, name, description, industry, keywords, competitors')
      .eq('id', brandId)
      .eq('user_id', user.id)
      .single();

    if (brandError || !brand) {
      throw new NotFoundError('Brand');
    }

    // Generate query expansions (preview mode - uses templates primarily for speed)
    const expansionResult = await expandQueries(
      {
        originalQuery: baseQuery,
        brandName: brand.name,
        industry: brand.industry,
        keywords: brand.keywords || [],
        competitors: brand.competitors || [],
        expansionLevel: expansionLevel as ExpansionLevel,
      },
      {
        useLLM: true, // Use LLM for better quality
        providers: providers as ProviderType[],
      }
    );

    logger.info('Batch scan preview generated', {
      brandId,
      userId: user.id,
      baseQuery,
      derivedCount: expansionResult.derivedQueries.length,
      estimatedCredits: expansionResult.estimatedCredits,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({
      derivedQueries: expansionResult.derivedQueries,
      totalQueries: expansionResult.totalQueries,
      estimatedCredits: expansionResult.estimatedCredits,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    const { json, status } = errorResponse(error);
    logger.error('Batch scan preview error', error, { durationMs: Date.now() - startTime });
    return NextResponse.json(json, { status });
  }
}
