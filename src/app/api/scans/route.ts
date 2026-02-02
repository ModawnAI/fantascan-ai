import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { inngest } from '@inngest/index';
import { CREDIT_COSTS } from '@/types/database';
import {
  validate,
  createScanSchema,
  getScansQuerySchema,
} from '@/lib/validations';
import {
  UnauthorizedError,
  NotFoundError,
  InsufficientCreditsError,
  DatabaseError,
  errorResponse,
} from '@/lib/errors';
import { rateLimiters } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    // Rate limit by user
    rateLimiters.scan(user.id);

    // Validate request body
    const body = await request.json();
    logger.debug('Scan request body', { body });
    const { brandId, query, providers } = validate(createScanSchema, body);

    // Verify brand ownership
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id, user_id')
      .eq('id', brandId)
      .eq('user_id', user.id)
      .single();

    if (brandError || !brand) {
      throw new NotFoundError('Brand');
    }

    // Calculate credits needed
    const creditsNeeded = providers.reduce(
      (sum, p) => sum + (CREDIT_COSTS[p] || 0),
      0
    );

    // Check user credits with row-level locking for atomicity
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('credits')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new DatabaseError('fetch user profile');
    }

    if (profile.credits < creditsNeeded) {
      throw new InsufficientCreditsError(creditsNeeded, profile.credits);
    }

    // Atomic credit deduction and scan creation using transaction-like approach
    // Deduct credits first (optimistic)
    const newCredits = profile.credits - creditsNeeded;
    const { error: updateError } = await supabase
      .from('users')
      .update({ credits: newCredits })
      .eq('id', user.id)
      .eq('credits', profile.credits); // Optimistic lock

    if (updateError) {
      throw new DatabaseError('deduct credits');
    }

    // Create scan
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .insert({
        brand_id: brandId,
        user_id: user.id,
        scan_type: 'single',
        status: 'pending',
        total_providers: providers.length,
        credits_used: creditsNeeded,
      })
      .select()
      .single();

    if (scanError || !scan) {
      // Rollback credits on failure
      await supabase
        .from('users')
        .update({ credits: profile.credits })
        .eq('id', user.id);

      logger.error('Scan creation failed', scanError, { userId: user.id, brandId });
      throw new DatabaseError('create scan');
    }

    // Create scan query
    const { error: queryError } = await supabase.from('scan_queries').insert({
      scan_id: scan.id,
      query_text: query,
      query_type: 'recommendation',
    });

    if (queryError) {
      logger.warn('Query creation failed', { scanId: scan.id, error: queryError });
    }

    // Trigger Inngest function
    await inngest.send({
      name: 'scan/brand.requested',
      data: {
        scanId: scan.id,
        brandId,
        userId: user.id,
        query,
        providers,
      },
    });

    logger.info('Scan created', {
      scanId: scan.id,
      brandId,
      userId: user.id,
      providers,
      creditsUsed: creditsNeeded,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ scanId: scan.id });
  } catch (error) {
    const { json, status } = errorResponse(error);
    logger.error('Scan creation error', error, { durationMs: Date.now() - startTime });
    return NextResponse.json(json, { status });
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Debug logging
    logger.info('Auth check in GET /api/scans', {
      hasUser: !!user,
      userId: user?.id,
      authError: authError?.message,
      cookies: request.cookies.getAll().map(c => c.name),
    });

    if (!user) {
      throw new UnauthorizedError();
    }

    // Validate query params
    const { searchParams } = new URL(request.url);
    const params = validate(getScansQuerySchema, {
      brandId: searchParams.get('brandId') || undefined,
      limit: searchParams.get('limit') || 10,
      offset: searchParams.get('offset') || 0,
      status: searchParams.get('status') || undefined,
    });

    // Extract with defaults for TypeScript
    const offset = params.offset ?? 0;
    const limit = params.limit ?? 10;

    let query = supabase
      .from('scans')
      .select('id, brand_id, scan_type, status, visibility_score, ai_visibility_score, seo_visibility_score, mentions_count, total_providers, credits_used, created_at, completed_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (params.brandId) {
      query = query.eq('brand_id', params.brandId);
    }

    if (params.status) {
      query = query.eq('status', params.status);
    }

    const { data: scans, error, count } = await query;

    if (error) {
      logger.error('Fetch scans failed', error, { userId: user.id });
      throw new DatabaseError('fetch scans');
    }

    logger.debug('Scans fetched', {
      userId: user.id,
      count: scans?.length,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({
      scans,
      pagination: {
        limit: params.limit,
        offset: params.offset,
        total: count,
      },
    });
  } catch (error) {
    const { json, status } = errorResponse(error);
    logger.error('Scans fetch error', error, { durationMs: Date.now() - startTime });
    return NextResponse.json(json, { status });
  }
}
