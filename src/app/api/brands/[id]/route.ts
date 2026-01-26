import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validate, updateBrandSchema } from '@/lib/validations';
import {
  UnauthorizedError,
  NotFoundError,
  DatabaseError,
  ValidationError,
  errorResponse,
} from '@/lib/errors';
import { rateLimiters } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const brandIdSchema = z.string().uuid('Invalid brand ID');

type RouteParams = { params: Promise<{ id: string }> };

function validateBrandId(id: string): void {
  const result = brandIdSchema.safeParse(id);
  if (!result.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.') || 'id';
      if (!errors[path]) {
        errors[path] = [];
      }
      errors[path].push(issue.message);
    }
    throw new ValidationError(errors);
  }
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const startTime = Date.now();

  try {
    const { id } = await params;
    validateBrandId(id);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    const { data: brand, error } = await supabase
      .from('brands')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !brand) {
      throw new NotFoundError('Brand');
    }

    logger.debug('Brand fetched', {
      brandId: id,
      userId: user.id,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ brand });
  } catch (error) {
    const { json, status } = errorResponse(error);
    logger.error('Brand fetch error', error, { durationMs: Date.now() - startTime });
    return NextResponse.json(json, { status });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  const startTime = Date.now();

  try {
    const { id } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    // Rate limit by user
    rateLimiters.brand(user.id);

    // Validate request body with ID
    const body = await request.json();
    const validatedData = validate(updateBrandSchema, { ...body, id });

    // Verify brand ownership
    const { data: existingBrand, error: fetchError } = await supabase
      .from('brands')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingBrand) {
      throw new NotFoundError('Brand');
    }

    // Build update object (only include provided fields)
    const updateData: Record<string, unknown> = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.industry !== undefined) updateData.industry = validatedData.industry;
    if (validatedData.keywords !== undefined) updateData.keywords = validatedData.keywords;
    if (validatedData.competitors !== undefined) updateData.competitors = validatedData.competitors;
    if (validatedData.isPrimary !== undefined) updateData.is_primary = validatedData.isPrimary;

    // If setting as primary, unset other primary brands first
    if (validatedData.isPrimary === true) {
      const { error: unsetError } = await supabase
        .from('brands')
        .update({ is_primary: false })
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .neq('id', id);

      if (unsetError) {
        logger.warn('Failed to unset other primary brands', { userId: user.id, error: unsetError });
      }
    }

    // Update brand
    const { data: brand, error: updateError } = await supabase
      .from('brands')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError || !brand) {
      logger.error('Brand update failed', updateError, { brandId: id, userId: user.id });
      throw new DatabaseError('update brand');
    }

    logger.info('Brand updated', {
      brandId: id,
      userId: user.id,
      fieldsUpdated: Object.keys(updateData),
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ brand });
  } catch (error) {
    const { json, status } = errorResponse(error);
    logger.error('Brand update error', error, { durationMs: Date.now() - startTime });
    return NextResponse.json(json, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  const startTime = Date.now();

  try {
    const { id } = await params;
    validateBrandId(id);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    // Rate limit by user
    rateLimiters.brand(user.id);

    // Verify brand ownership before deletion
    const { data: existingBrand, error: fetchError } = await supabase
      .from('brands')
      .select('id, user_id, name')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingBrand) {
      throw new NotFoundError('Brand');
    }

    // Check if there are scans associated with this brand
    const { count: scanCount, error: scanCountError } = await supabase
      .from('scans')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', id);

    if (scanCountError) {
      logger.warn('Failed to check scan count', { brandId: id, error: scanCountError });
    }

    // Delete the brand (cascade will handle related records if configured)
    const { error: deleteError } = await supabase
      .from('brands')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      logger.error('Brand deletion failed', deleteError, { brandId: id, userId: user.id });
      throw new DatabaseError('delete brand');
    }

    logger.info('Brand deleted', {
      brandId: id,
      brandName: existingBrand.name,
      userId: user.id,
      associatedScans: scanCount || 0,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const { json, status } = errorResponse(error);
    logger.error('Brand deletion error', error, { durationMs: Date.now() - startTime });
    return NextResponse.json(json, { status });
  }
}
