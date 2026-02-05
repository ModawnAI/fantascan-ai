import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validate, updateScanSettingsSchema } from '@/lib/validations';
import {
  UnauthorizedError,
  DatabaseError,
  errorResponse,
} from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { UserScanSettings } from '@/types/batch-scan';

const DEFAULT_SETTINGS: Omit<UserScanSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  gemini_iterations: 50,
  openai_iterations: 50,
  timeout_per_call_ms: 30000,
  default_brand_id: null,
};

/**
 * GET /api/settings/scan
 * 사용자의 스캔 설정 조회
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    // Fetch settings
    const { data: settings, error } = await supabase
      .from('user_scan_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      logger.error('Fetch scan settings failed', error, { userId: user.id });
      throw new DatabaseError('fetch scan settings');
    }

    // Return settings or defaults
    const result = settings || {
      ...DEFAULT_SETTINGS,
      user_id: user.id,
    };

    // Also fetch default brand info if set
    let defaultBrand = null;
    if (result.default_brand_id) {
      const { data: brand } = await supabase
        .from('brands')
        .select('id, name, description, industry, keywords, competitors')
        .eq('id', result.default_brand_id)
        .eq('user_id', user.id)
        .single();
      
      defaultBrand = brand;
    }

    // If no default brand, get user's primary brand
    if (!defaultBrand) {
      const { data: primaryBrand } = await supabase
        .from('brands')
        .select('id, name, description, industry, keywords, competitors')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .single();
      
      defaultBrand = primaryBrand;
    }

    logger.debug('Scan settings fetched', {
      userId: user.id,
      hasSettings: !!settings,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({
      settings: result,
      defaultBrand,
    });
  } catch (error) {
    const { json, status } = errorResponse(error);
    logger.error('Scan settings fetch error', error, { durationMs: Date.now() - startTime });
    return NextResponse.json(json, { status });
  }
}

/**
 * PATCH /api/settings/scan
 * 스캔 설정 수정
 */
export async function PATCH(request: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    // Validate request body
    const body = await request.json();
    const validatedData = validate(updateScanSettingsSchema, body);

    // Verify brand ownership if default_brand_id is being set
    if (validatedData.default_brand_id) {
      const { data: brand, error: brandError } = await supabase
        .from('brands')
        .select('id')
        .eq('id', validatedData.default_brand_id)
        .eq('user_id', user.id)
        .single();

      if (brandError || !brand) {
        return NextResponse.json(
          { error: '유효하지 않은 브랜드입니다' },
          { status: 400 }
        );
      }
    }

    // Check if settings exist
    const { data: existing } = await supabase
      .from('user_scan_settings')
      .select('id')
      .eq('user_id', user.id)
      .single();

    let result;

    if (existing) {
      // Update existing
      const { data: updated, error: updateError } = await supabase
        .from('user_scan_settings')
        .update({
          ...validatedData,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) {
        logger.error('Update scan settings failed', updateError, { userId: user.id });
        throw new DatabaseError('update scan settings');
      }

      result = updated;
    } else {
      // Create new
      const { data: created, error: createError } = await supabase
        .from('user_scan_settings')
        .insert({
          user_id: user.id,
          ...DEFAULT_SETTINGS,
          ...validatedData,
        })
        .select()
        .single();

      if (createError) {
        logger.error('Create scan settings failed', createError, { userId: user.id });
        throw new DatabaseError('create scan settings');
      }

      result = created;
    }

    logger.info('Scan settings updated', {
      userId: user.id,
      isNew: !existing,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ settings: result });
  } catch (error) {
    const { json, status } = errorResponse(error);
    logger.error('Scan settings update error', error, { durationMs: Date.now() - startTime });
    return NextResponse.json(json, { status });
  }
}
