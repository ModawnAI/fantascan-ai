import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  validate,
  createBrandSchema,
  getBrandsQuerySchema,
} from '@/lib/validations';
import {
  UnauthorizedError,
  DatabaseError,
  ConflictError,
  errorResponse,
} from '@/lib/errors';
import { rateLimiters } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const MAX_BRANDS_PER_USER = 10;

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    // Rate limit by user
    rateLimiters.brand(user.id);

    // Validate request body
    const body = await request.json();
    const validatedData = validate(createBrandSchema, body);

    // Check existing brand count
    const { count, error: countError } = await supabase
      .from('brands')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) {
      logger.error('Brand count check failed', countError, { userId: user.id });
      throw new DatabaseError('check brand count');
    }

    if (count !== null && count >= MAX_BRANDS_PER_USER) {
      throw new ConflictError(`Maximum ${MAX_BRANDS_PER_USER} brands allowed per user`);
    }

    // If this is set as primary, unset other primary brands
    if (validatedData.isPrimary) {
      const { error: unsetError } = await supabase
        .from('brands')
        .update({ is_primary: false })
        .eq('user_id', user.id)
        .eq('is_primary', true);

      if (unsetError) {
        logger.warn('Failed to unset primary brand', { userId: user.id, error: unsetError });
      }
    }

    // Create brand
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .insert({
        user_id: user.id,
        name: validatedData.name,
        description: validatedData.description || null,
        industry: validatedData.industry,
        keywords: validatedData.keywords,
        competitors: validatedData.competitors,
        is_primary: validatedData.isPrimary,
      })
      .select()
      .single();

    if (brandError || !brand) {
      logger.error('Brand creation failed', brandError, { userId: user.id });
      throw new DatabaseError('create brand');
    }

    logger.info('Brand created', {
      brandId: brand.id,
      userId: user.id,
      industry: validatedData.industry,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ brand }, { status: 201 });
  } catch (error) {
    const { json, status } = errorResponse(error);
    logger.error('Brand creation error', error, { durationMs: Date.now() - startTime });
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

    // Validate query params
    const { searchParams } = new URL(request.url);
    const params = validate(getBrandsQuerySchema, {
      limit: searchParams.get('limit') || 10,
      offset: searchParams.get('offset') || 0,
      industry: searchParams.get('industry') || undefined,
    });

    // Extract with defaults for TypeScript
    const offset = params.offset ?? 0;
    const limit = params.limit ?? 10;

    let query = supabase
      .from('brands')
      .select('id, name, description, industry, keywords, competitors, is_primary, created_at, updated_at', { count: 'exact' })
      .eq('user_id', user.id)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (params.industry) {
      query = query.eq('industry', params.industry);
    }

    const { data: brands, error, count } = await query;

    if (error) {
      logger.error('Fetch brands failed', error, { userId: user.id });
      throw new DatabaseError('fetch brands');
    }

    logger.debug('Brands fetched', {
      userId: user.id,
      count: brands?.length,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({
      brands,
      pagination: {
        limit: params.limit,
        offset: params.offset,
        total: count,
      },
    });
  } catch (error) {
    const { json, status } = errorResponse(error);
    logger.error('Brands fetch error', error, { durationMs: Date.now() - startTime });
    return NextResponse.json(json, { status });
  }
}
