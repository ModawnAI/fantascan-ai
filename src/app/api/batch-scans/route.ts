import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { inngest } from '../../../../inngest/client';
import {
  validate,
  createBatchScanSchema,
  getBatchScansQuerySchema,
} from '@/lib/validations';
import {
  UnauthorizedError,
  DatabaseError,
  NotFoundError,
  errorResponse,
} from '@/lib/errors';
import { logger } from '@/lib/logger';
import { calculateEstimatedCredits, calculateDetailedDuration } from '@/lib/credits';
import type { SettingsSnapshot } from '@/types/batch-scan';

/**
 * GET /api/batch-scans
 * 배치 스캔 목록 조회
 */
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
    const params = validate(getBatchScansQuerySchema, {
      limit: searchParams.get('limit') || 10,
      offset: searchParams.get('offset') || 0,
      status: searchParams.get('status') || undefined,
    });

    const offset = params.offset ?? 0;
    const limit = params.limit ?? 10;

    let query = supabase
      .from('batch_scans_v2')
      .select(`
        id,
        brand_id,
        question_set_id,
        status,
        pause_reason,
        total_questions,
        completed_questions,
        total_iterations,
        completed_iterations,
        estimated_credits,
        used_credits,
        overall_exposure_rate,
        started_at,
        completed_at,
        created_at,
        brands!inner(name),
        question_sets(name)
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (params.status) {
      query = query.eq('status', params.status);
    }

    const { data: batchScans, error, count } = await query;

    if (error) {
      logger.error('Fetch batch scans failed', error, { userId: user.id });
      throw new DatabaseError('fetch batch scans');
    }

    // Transform response
    const transformedScans = (batchScans || []).map((scan: Record<string, unknown>) => ({
      id: scan.id,
      brand_id: scan.brand_id,
      brand_name: (scan.brands as { name: string })?.name,
      question_set_id: scan.question_set_id,
      question_set_name: (scan.question_sets as { name: string } | null)?.name,
      status: scan.status,
      pause_reason: scan.pause_reason,
      total_questions: scan.total_questions,
      completed_questions: scan.completed_questions,
      total_iterations: scan.total_iterations,
      completed_iterations: scan.completed_iterations,
      estimated_credits: scan.estimated_credits,
      used_credits: scan.used_credits,
      overall_exposure_rate: scan.overall_exposure_rate,
      started_at: scan.started_at,
      completed_at: scan.completed_at,
      created_at: scan.created_at,
    }));

    logger.debug('Batch scans fetched', {
      userId: user.id,
      count: transformedScans.length,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({
      batchScans: transformedScans,
      pagination: {
        limit: params.limit,
        offset: params.offset,
        total: count,
      },
    });
  } catch (error) {
    const { json, status } = errorResponse(error);
    logger.error('Batch scans fetch error', error, { durationMs: Date.now() - startTime });
    return NextResponse.json(json, { status });
  }
}

/**
 * POST /api/batch-scans
 * 새 배치 스캔 생성 및 시작
 */
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
    const validatedData = validate(createBatchScanSchema, body);

    // Get user's scan settings
    const { data: settings, error: settingsError } = await supabase
      .from('user_scan_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    logger.info('Fetched user scan settings', {
      userId: user.id,
      hasSettings: !!settings,
      settingsError: settingsError?.code,
      geminiIterations: settings?.gemini_iterations,
      openaiIterations: settings?.openai_iterations,
    });

    const geminiIterations = settings?.gemini_iterations ?? 50;
    const openaiIterations = settings?.openai_iterations ?? 50;
    const timeoutMs = settings?.timeout_per_call_ms ?? 30000;
    const defaultBrandId = settings?.default_brand_id;

    // Get question set with items
    const { data: questionSet, error: setError } = await supabase
      .from('question_sets')
      .select(`
        id,
        name,
        user_id,
        question_set_items(
          id,
          question_text,
          order_index,
          is_active
        )
      `)
      .eq('id', validatedData.question_set_id)
      .eq('user_id', user.id)
      .single();

    if (setError || !questionSet) {
      throw new NotFoundError('question set');
    }

    // Filter active items
    const items = (questionSet.question_set_items as Array<{
      id: string;
      question_text: string;
      order_index: number;
      is_active: boolean;
    }>)
      .filter((item) => item.is_active)
      .sort((a, b) => a.order_index - b.order_index);

    if (items.length === 0) {
      return NextResponse.json(
        { error: '활성화된 질문이 없습니다' },
        { status: 400 }
      );
    }

    // Get default brand
    let brandId = defaultBrandId;
    if (!brandId) {
      const { data: primaryBrand } = await supabase
        .from('brands')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .single();

      brandId = primaryBrand?.id;
    }

    if (!brandId) {
      return NextResponse.json(
        { error: '기본 브랜드를 설정해주세요' },
        { status: 400 }
      );
    }

    // Get brand details
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id, name, keywords, competitors')
      .eq('id', brandId)
      .eq('user_id', user.id)
      .single();

    if (brandError || !brand) {
      throw new NotFoundError('brand');
    }

    // Calculate estimates
    const questionCount = items.length;
    const creditEstimate = calculateEstimatedCredits(
      questionCount,
      geminiIterations,
      openaiIterations
    );
    const durationEstimate = calculateDetailedDuration(
      questionCount,
      geminiIterations,
      openaiIterations
    );

    // Check user credits
    const { data: userProfile } = await supabase
      .from('users')
      .select('credits')
      .eq('id', user.id)
      .single();

    if (!userProfile || userProfile.credits < creditEstimate.totalCredits) {
      return NextResponse.json(
        {
          error: '크레딧이 부족합니다',
          required: creditEstimate.totalCredits,
          available: userProfile?.credits || 0,
        },
        { status: 402 }
      );
    }

    // Create settings snapshot
    const settingsSnapshot: SettingsSnapshot = {
      gemini_iterations: geminiIterations,
      openai_iterations: openaiIterations,
      timeout_per_call_ms: timeoutMs,
      brand_name: brand.name,
      brand_keywords: brand.keywords || [],
      brand_competitors: brand.competitors || [],
    };

    // Create batch scan
    const { data: batchScan, error: scanError } = await supabase
      .from('batch_scans_v2')
      .insert({
        user_id: user.id,
        brand_id: brandId,
        question_set_id: questionSet.id,
        status: 'pending',
        total_questions: questionCount,
        total_iterations: creditEstimate.totalIterations,
        estimated_credits: creditEstimate.totalCredits,
        estimated_duration_ms: durationEstimate.avgDurationMs,
        settings_snapshot: settingsSnapshot,
      })
      .select()
      .single();

    if (scanError || !batchScan) {
      logger.error('Create batch scan failed', scanError, { userId: user.id });
      throw new DatabaseError('create batch scan');
    }

    // Create batch scan questions
    const questions = items.map((item, index) => ({
      batch_scan_id: batchScan.id,
      question_set_item_id: item.id,
      question_text: item.question_text,
      question_order: index,
      gemini_total: geminiIterations,
      openai_total: openaiIterations,
    }));

    const { error: questionsError } = await supabase
      .from('batch_scan_questions')
      .insert(questions);

    if (questionsError) {
      logger.error('Create batch scan questions failed', questionsError, {
        userId: user.id,
        batchScanId: batchScan.id,
      });
      // Rollback - delete batch scan
      await supabase.from('batch_scans_v2').delete().eq('id', batchScan.id);
      throw new DatabaseError('create batch scan questions');
    }

    // Trigger Inngest function
    await inngest.send({
      name: 'batch-scan/v2.start',
      data: {
        batchScanId: batchScan.id,
        userId: user.id,
      },
    });

    logger.info('Batch scan created and started', {
      batchScanId: batchScan.id,
      userId: user.id,
      questionCount,
      estimatedCredits: creditEstimate.totalCredits,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        batchScan: {
          ...batchScan,
          brand_name: brand.name,
          question_set_name: questionSet.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const { json, status } = errorResponse(error);
    logger.error('Batch scan creation error', error, { durationMs: Date.now() - startTime });
    return NextResponse.json(json, { status });
  }
}
