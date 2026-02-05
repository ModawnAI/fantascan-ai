import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { inngest } from '../../../../../inngest/client';
import {
  UnauthorizedError,
  NotFoundError,
  DatabaseError,
  errorResponse,
} from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { BatchScanStatus, PauseReason } from '@/types/batch-scan';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/batch-scans/:id
 * 배치 스캔 상세 조회 (질문별 진행 상황 포함)
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

    // Fetch batch scan
    const { data: batchScan, error: scanError } = await supabase
      .from('batch_scans_v2')
      .select(`
        *,
        brands!inner(name, keywords, competitors),
        question_sets(name)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (scanError || !batchScan) {
      throw new NotFoundError('batch scan');
    }

    // Fetch questions
    const { data: questions, error: questionsError } = await supabase
      .from('batch_scan_questions')
      .select('*')
      .eq('batch_scan_id', id)
      .order('question_order', { ascending: true });

    if (questionsError) {
      logger.error('Fetch batch scan questions failed', questionsError, {
        userId: user.id,
        batchScanId: id,
      });
      throw new DatabaseError('fetch batch scan questions');
    }

    // Transform response
    const response = {
      id: batchScan.id,
      user_id: batchScan.user_id,
      brand_id: batchScan.brand_id,
      brand_name: (batchScan.brands as { name: string })?.name,
      brand_keywords: (batchScan.brands as { keywords: string[] })?.keywords || [],
      brand_competitors: (batchScan.brands as { competitors: string[] })?.competitors || [],
      question_set_id: batchScan.question_set_id,
      question_set_name: (batchScan.question_sets as { name: string } | null)?.name,
      status: batchScan.status,
      pause_reason: batchScan.pause_reason,
      total_questions: batchScan.total_questions,
      completed_questions: batchScan.completed_questions,
      total_iterations: batchScan.total_iterations,
      completed_iterations: batchScan.completed_iterations,
      estimated_credits: batchScan.estimated_credits,
      used_credits: batchScan.used_credits,
      overall_exposure_rate: batchScan.overall_exposure_rate,
      settings_snapshot: batchScan.settings_snapshot,
      estimated_duration_ms: batchScan.estimated_duration_ms,
      started_at: batchScan.started_at,
      paused_at: batchScan.paused_at,
      resumed_at: batchScan.resumed_at,
      completed_at: batchScan.completed_at,
      created_at: batchScan.created_at,
      questions: questions || [],
    };

    logger.debug('Batch scan fetched', {
      userId: user.id,
      batchScanId: id,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ batchScan: response });
  } catch (error) {
    const { json, status } = errorResponse(error);
    logger.error('Batch scan fetch error', error, {
      batchScanId: id,
      durationMs: Date.now() - startTime,
    });
    return NextResponse.json(json, { status });
  }
}

/**
 * POST /api/batch-scans/:id
 * 배치 스캔 일시정지/재개
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now();
  const { id } = await params;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    const body = await request.json();
    const { action } = body as { action: 'pause' | 'resume' };

    if (!action || !['pause', 'resume'].includes(action)) {
      return NextResponse.json(
        { error: 'action은 "pause" 또는 "resume"이어야 합니다' },
        { status: 400 }
      );
    }

    // Fetch batch scan
    const { data: batchScan, error: scanError } = await supabase
      .from('batch_scans_v2')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (scanError || !batchScan) {
      throw new NotFoundError('batch scan');
    }

    if (action === 'pause') {
      // Pause scan
      if (batchScan.status !== 'running') {
        return NextResponse.json(
          { error: '진행 중인 스캔만 일시정지할 수 있습니다', currentStatus: batchScan.status },
          { status: 400 }
        );
      }

      const { error: updateError } = await supabase
        .from('batch_scans_v2')
        .update({
          status: 'paused' as BatchScanStatus,
          pause_reason: 'user_paused' as PauseReason,
          paused_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) {
        logger.error('Pause batch scan failed', updateError, {
          userId: user.id,
          batchScanId: id,
        });
        throw new DatabaseError('pause batch scan');
      }

      logger.info('Batch scan paused', {
        batchScanId: id,
        userId: user.id,
        durationMs: Date.now() - startTime,
      });

      return NextResponse.json({ success: true, message: '스캔이 일시정지되었습니다' });

    } else {
      // Resume scan
      if (batchScan.status !== 'paused') {
        return NextResponse.json(
          { error: '일시정지된 스캔만 재개할 수 있습니다', currentStatus: batchScan.status },
          { status: 400 }
        );
      }

      // Check remaining credits
      const remainingCredits = batchScan.estimated_credits - batchScan.used_credits;
      const { data: userProfile } = await supabase
        .from('users')
        .select('credits')
        .eq('id', user.id)
        .single();

      if (!userProfile || userProfile.credits < remainingCredits) {
        return NextResponse.json(
          {
            error: '크레딧이 부족합니다',
            required: remainingCredits,
            available: userProfile?.credits || 0,
          },
          { status: 402 }
        );
      }

      // Trigger resume via Inngest
      await inngest.send({
        name: 'batch-scan/v2.resume',
        data: {
          batchScanId: id,
          userId: user.id,
        },
      });

      logger.info('Batch scan resumed', {
        batchScanId: id,
        userId: user.id,
        durationMs: Date.now() - startTime,
      });

      return NextResponse.json({ success: true, message: '스캔이 재개되었습니다' });
    }
  } catch (error) {
    const { json, status } = errorResponse(error);
    logger.error('Batch scan action error', error, {
      batchScanId: id,
      durationMs: Date.now() - startTime,
    });
    return NextResponse.json(json, { status });
  }
}

/**
 * DELETE /api/batch-scans/:id
 * 배치 스캔 삭제 (pending/paused/completed/failed 상태만)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now();
  const { id } = await params;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    // Fetch batch scan
    const { data: batchScan, error: scanError } = await supabase
      .from('batch_scans_v2')
      .select('status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (scanError || !batchScan) {
      throw new NotFoundError('batch scan');
    }

    // Can't delete running scan
    if (batchScan.status === 'running') {
      return NextResponse.json(
        { error: '진행 중인 스캔은 삭제할 수 없습니다. 먼저 일시정지해주세요.' },
        { status: 400 }
      );
    }

    // Delete (cascade will delete questions and iterations)
    const { error: deleteError } = await supabase
      .from('batch_scans_v2')
      .delete()
      .eq('id', id);

    if (deleteError) {
      logger.error('Delete batch scan failed', deleteError, {
        userId: user.id,
        batchScanId: id,
      });
      throw new DatabaseError('delete batch scan');
    }

    logger.info('Batch scan deleted', {
      batchScanId: id,
      userId: user.id,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const { json, status } = errorResponse(error);
    logger.error('Batch scan deletion error', error, {
      batchScanId: id,
      durationMs: Date.now() - startTime,
    });
    return NextResponse.json(json, { status });
  }
}
