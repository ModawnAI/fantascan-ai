import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { inngest } from '@inngest/index';
import { CREDIT_COSTS, type ProviderType } from '@/types/database';
import { expandQueries, previewExpansion, type ExpansionLevel } from '@/services/query-expansion';
import { estimateBatchCredits } from '@/services/batch-scan';
import {
  UnauthorizedError,
  NotFoundError,
  InsufficientCreditsError,
  DatabaseError,
  errorResponse,
} from '@/lib/errors';
import { rateLimiters } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Validation schema
const createBatchScanSchema = z.object({
  brandId: z.string().uuid(),
  baseQuery: z.string().min(2).max(500),
  expansionLevel: z.enum(['minimal', 'standard', 'comprehensive']).default('standard'),
  providers: z.array(z.enum(['gemini', 'openai', 'anthropic', 'grok', 'perplexity', 'google_search'])).min(1).max(6),
  useLLMExpansion: z.boolean().default(true),
});

const getBatchScansQuerySchema = z.object({
  brandId: z.string().uuid().optional(),
  status: z.enum(['queued', 'running', 'completed', 'failed', 'cancelled']).optional(),
  limit: z.coerce.number().min(1).max(100).default(10),
  offset: z.coerce.number().min(0).default(0),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    // Rate limit
    rateLimiters.scan(user.id);

    // Validate request body
    const body = await request.json();
    const validatedBody = createBatchScanSchema.parse(body);
    const { brandId, baseQuery, expansionLevel, providers, useLLMExpansion } = validatedBody;

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

    // Expand queries
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
        useLLM: useLLMExpansion,
        providers: providers as ProviderType[],
      }
    );

    // Calculate total credits needed
    const totalCredits = estimateBatchCredits(
      expansionResult.totalQueries,
      providers as ProviderType[]
    );

    // Check user credits
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('credits')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new DatabaseError('fetch user profile');
    }

    if (profile.credits < totalCredits) {
      throw new InsufficientCreditsError(totalCredits, profile.credits);
    }

    // Deduct credits
    const newCredits = profile.credits - totalCredits;
    const { error: updateError } = await supabase
      .from('users')
      .update({ credits: newCredits })
      .eq('id', user.id)
      .eq('credits', profile.credits);

    if (updateError) {
      throw new DatabaseError('deduct credits');
    }

    // Create batch scan record
    const { data: batchScan, error: batchError } = await supabase
      .from('batch_scans')
      .insert({
        brand_id: brandId,
        user_id: user.id,
        base_query: baseQuery,
        expansion_level: expansionLevel,
        status: 'queued',
        total_queries: expansionResult.totalQueries,
        completed_queries: 0,
        failed_queries: 0,
        credits_used: totalCredits,
        estimated_credits: totalCredits,
        providers: providers,
      })
      .select()
      .single();

    if (batchError || !batchScan) {
      // Rollback credits
      await supabase
        .from('users')
        .update({ credits: profile.credits })
        .eq('id', user.id);
      
      logger.error('Batch scan creation failed', batchError, { userId: user.id, brandId });
      throw new DatabaseError('create batch scan');
    }

    // Store query expansions
    const expansionRecords = [
      // Original query
      {
        batch_scan_id: batchScan.id,
        original_query: baseQuery,
        derived_query: baseQuery,
        query_type: 'intent_variation',
        intent_description: '원본 쿼리',
        relevance_score: 1.0,
      },
      // Derived queries
      ...expansionResult.derivedQueries.map(q => ({
        batch_scan_id: batchScan.id,
        original_query: baseQuery,
        derived_query: q.query,
        query_type: q.type,
        intent_description: q.intent,
        relevance_score: q.relevanceScore,
      })),
    ];

    const { error: expansionError } = await supabase
      .from('query_expansions')
      .insert(expansionRecords);

    if (expansionError) {
      logger.warn('Failed to store query expansions', { error: expansionError });
    }

    // Trigger Inngest function
    await inngest.send({
      name: 'scan/batch.requested',
      data: {
        batchScanId: batchScan.id,
        brandId,
        userId: user.id,
        baseQuery,
        derivedQueries: expansionResult.derivedQueries,
        providers,
        expansionLevel,
      },
    });

    logger.info('Batch scan created', {
      batchScanId: batchScan.id,
      brandId,
      userId: user.id,
      totalQueries: expansionResult.totalQueries,
      creditsUsed: totalCredits,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({
      batchScanId: batchScan.id,
      totalQueries: expansionResult.totalQueries,
      estimatedCredits: totalCredits,
      derivedQueries: expansionResult.derivedQueries,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    const { json, status } = errorResponse(error);
    logger.error('Batch scan creation error', error, { durationMs: Date.now() - startTime });
    return NextResponse.json(json, { status });
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const params = getBatchScansQuerySchema.parse({
      brandId: searchParams.get('brandId') || undefined,
      status: searchParams.get('status') || undefined,
      limit: searchParams.get('limit') || 10,
      offset: searchParams.get('offset') || 0,
    });

    let query = supabase
      .from('batch_scans')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(params.offset, params.offset + params.limit - 1);

    if (params.brandId) {
      query = query.eq('brand_id', params.brandId);
    }

    if (params.status) {
      query = query.eq('status', params.status);
    }

    const { data: batchScans, error, count } = await query;

    if (error) {
      logger.error('Fetch batch scans failed', error, { userId: user.id });
      throw new DatabaseError('fetch batch scans');
    }

    return NextResponse.json({
      batchScans,
      pagination: {
        limit: params.limit,
        offset: params.offset,
        total: count,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    const { json, status } = errorResponse(error);
    logger.error('Batch scans fetch error', error, { durationMs: Date.now() - startTime });
    return NextResponse.json(json, { status });
  }
}
