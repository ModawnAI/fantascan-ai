import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  validate,
  createQuestionSetSchema,
  getQuestionSetsQuerySchema,
} from '@/lib/validations';
import {
  UnauthorizedError,
  DatabaseError,
  errorResponse,
} from '@/lib/errors';
import { rateLimiters } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const MAX_QUESTION_SETS_PER_USER = 20;

/**
 * GET /api/question-sets
 * 사용자의 질문 세트 목록 조회
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
    const params = validate(getQuestionSetsQuerySchema, {
      limit: searchParams.get('limit') || 20,
      offset: searchParams.get('offset') || 0,
      active_only: searchParams.get('active_only') ?? 'true',
    });

    const offset = params.offset ?? 0;
    const limit = params.limit ?? 20;

    let query = supabase
      .from('question_sets')
      .select(`
        id,
        name,
        description,
        is_active,
        last_used_at,
        created_at,
        updated_at,
        question_set_items!inner(count)
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('last_used_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (params.active_only) {
      query = query.eq('is_active', true);
    }

    const { data: sets, error, count } = await query;

    if (error) {
      logger.error('Fetch question sets failed', error, { userId: user.id });
      throw new DatabaseError('fetch question sets');
    }

    // 각 세트의 질문 수 계산을 위해 별도 쿼리
    const setsWithCount = await Promise.all(
      (sets || []).map(async (set) => {
        const { count: itemCount } = await supabase
          .from('question_set_items')
          .select('*', { count: 'exact', head: true })
          .eq('question_set_id', set.id)
          .eq('is_active', true);

        return {
          id: set.id,
          name: set.name,
          description: set.description,
          is_active: set.is_active,
          last_used_at: set.last_used_at,
          created_at: set.created_at,
          updated_at: set.updated_at,
          question_count: itemCount || 0,
        };
      })
    );

    logger.debug('Question sets fetched', {
      userId: user.id,
      count: setsWithCount.length,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({
      sets: setsWithCount,
      pagination: {
        limit: params.limit,
        offset: params.offset,
        total: count,
      },
    });
  } catch (error) {
    const { json, status } = errorResponse(error);
    logger.error('Question sets fetch error', error, { durationMs: Date.now() - startTime });
    return NextResponse.json(json, { status });
  }
}

/**
 * POST /api/question-sets
 * 새 질문 세트 생성
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    // Rate limit
    rateLimiters.brand(user.id);

    // Validate request body
    const body = await request.json();
    const validatedData = validate(createQuestionSetSchema, body);

    // Check existing set count
    const { count, error: countError } = await supabase
      .from('question_sets')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) {
      logger.error('Question set count check failed', countError, { userId: user.id });
      throw new DatabaseError('check question set count');
    }

    if (count !== null && count >= MAX_QUESTION_SETS_PER_USER) {
      return NextResponse.json(
        { error: `최대 ${MAX_QUESTION_SETS_PER_USER}개의 질문 세트만 만들 수 있습니다` },
        { status: 400 }
      );
    }

    // Create question set
    const { data: questionSet, error: setError } = await supabase
      .from('question_sets')
      .insert({
        user_id: user.id,
        name: validatedData.name,
        description: validatedData.description || null,
      })
      .select()
      .single();

    if (setError || !questionSet) {
      logger.error('Question set creation failed', setError, { userId: user.id });
      throw new DatabaseError('create question set');
    }

    // Create question items
    const items = validatedData.questions.map((text, index) => ({
      question_set_id: questionSet.id,
      question_text: text,
      order_index: index,
    }));

    const { data: createdItems, error: itemsError } = await supabase
      .from('question_set_items')
      .insert(items)
      .select();

    if (itemsError) {
      logger.error('Question items creation failed', itemsError, {
        userId: user.id,
        questionSetId: questionSet.id,
      });
      // Rollback - delete the question set
      await supabase.from('question_sets').delete().eq('id', questionSet.id);
      throw new DatabaseError('create question items');
    }

    logger.info('Question set created', {
      questionSetId: questionSet.id,
      userId: user.id,
      questionCount: items.length,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        set: {
          ...questionSet,
          items: createdItems,
          question_count: createdItems?.length || 0,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const { json, status } = errorResponse(error);
    logger.error('Question set creation error', error, { durationMs: Date.now() - startTime });
    return NextResponse.json(json, { status });
  }
}
