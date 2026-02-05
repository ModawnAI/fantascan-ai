import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validate, updateQuestionSetSchema } from '@/lib/validations';
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
 * GET /api/question-sets/:id
 * 단일 질문 세트 상세 조회 (질문 포함)
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

    // Fetch question set
    const { data: questionSet, error: setError } = await supabase
      .from('question_sets')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (setError || !questionSet) {
      throw new NotFoundError('question set');
    }

    // Fetch items
    const { data: items, error: itemsError } = await supabase
      .from('question_set_items')
      .select('*')
      .eq('question_set_id', id)
      .order('order_index', { ascending: true });

    if (itemsError) {
      logger.error('Fetch question items failed', itemsError, {
        userId: user.id,
        questionSetId: id,
      });
      throw new DatabaseError('fetch question items');
    }

    logger.debug('Question set fetched', {
      userId: user.id,
      questionSetId: id,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({
      set: {
        ...questionSet,
        items: items || [],
      },
    });
  } catch (error) {
    const { json, status } = errorResponse(error);
    logger.error('Question set fetch error', error, {
      questionSetId: id,
      durationMs: Date.now() - startTime,
    });
    return NextResponse.json(json, { status });
  }
}

/**
 * PATCH /api/question-sets/:id
 * 질문 세트 수정
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now();
  const { id } = await params;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    // Validate request body
    const body = await request.json();
    const validatedData = validate(updateQuestionSetSchema, body);

    // Check ownership
    const { data: existing, error: checkError } = await supabase
      .from('question_sets')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (checkError || !existing) {
      throw new NotFoundError('question set');
    }

    // Update question set
    const { data: updated, error: updateError } = await supabase
      .from('question_sets')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updated) {
      logger.error('Question set update failed', updateError, {
        userId: user.id,
        questionSetId: id,
      });
      throw new DatabaseError('update question set');
    }

    logger.info('Question set updated', {
      questionSetId: id,
      userId: user.id,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ set: updated });
  } catch (error) {
    const { json, status } = errorResponse(error);
    logger.error('Question set update error', error, {
      questionSetId: id,
      durationMs: Date.now() - startTime,
    });
    return NextResponse.json(json, { status });
  }
}

/**
 * DELETE /api/question-sets/:id
 * 질문 세트 삭제
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

    // Check ownership
    const { data: existing, error: checkError } = await supabase
      .from('question_sets')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (checkError || !existing) {
      throw new NotFoundError('question set');
    }

    // Delete (cascade will delete items)
    const { error: deleteError } = await supabase
      .from('question_sets')
      .delete()
      .eq('id', id);

    if (deleteError) {
      logger.error('Question set deletion failed', deleteError, {
        userId: user.id,
        questionSetId: id,
      });
      throw new DatabaseError('delete question set');
    }

    logger.info('Question set deleted', {
      questionSetId: id,
      userId: user.id,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const { json, status } = errorResponse(error);
    logger.error('Question set deletion error', error, {
      questionSetId: id,
      durationMs: Date.now() - startTime,
    });
    return NextResponse.json(json, { status });
  }
}
