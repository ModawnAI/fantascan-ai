import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  UnauthorizedError,
  NotFoundError,
  DatabaseError,
  errorResponse,
} from '@/lib/errors';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/batch-scans/:id/iterations?questionId=xxx
 * 질문별 개별 LLM 응답(iterations) 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now();
  const { id } = await params;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    // Validate questionId parameter
    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get('questionId');

    if (!questionId) {
      return NextResponse.json(
        { error: 'questionId 파라미터가 필요합니다' },
        { status: 400 }
      );
    }

    // Verify batch scan ownership
    const { data: batchScan, error: scanError } = await supabase
      .from('batch_scans_v2')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (scanError || !batchScan) {
      throw new NotFoundError('batch scan');
    }

    // Verify question belongs to this batch scan
    const { data: question, error: questionError } = await supabase
      .from('batch_scan_questions')
      .select('id')
      .eq('id', questionId)
      .eq('batch_scan_id', id)
      .single();

    if (questionError || !question) {
      throw new NotFoundError('batch scan question');
    }

    // Fetch iterations for this question
    const { data: iterations, error: iterationsError } = await supabase
      .from('batch_scan_iterations')
      .select('*')
      .eq('batch_scan_question_id', questionId)
      .order('provider', { ascending: true })
      .order('iteration_index', { ascending: true });

    if (iterationsError) {
      logger.error('Fetch batch scan iterations failed', iterationsError, {
        userId: user.id,
        batchScanId: id,
        questionId,
      });
      throw new DatabaseError('fetch batch scan iterations');
    }

    logger.debug('Batch scan iterations fetched', {
      userId: user.id,
      batchScanId: id,
      questionId,
      count: iterations?.length ?? 0,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ iterations: iterations ?? [] });
  } catch (error) {
    const { json, status } = errorResponse(error);
    logger.error('Batch scan iterations fetch error', error, {
      batchScanId: id,
      durationMs: Date.now() - startTime,
    });
    return NextResponse.json(json, { status });
  }
}
