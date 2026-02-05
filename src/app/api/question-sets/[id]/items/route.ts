import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  validate,
  addQuestionItemSchema,
  updateQuestionItemSchema,
  reorderQuestionsSchema,
} from '@/lib/validations';
import {
  UnauthorizedError,
  NotFoundError,
  DatabaseError,
  errorResponse,
} from '@/lib/errors';
import { logger } from '@/lib/logger';

const MAX_QUESTIONS_PER_SET = 50;

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/question-sets/:id/items
 * 질문 세트의 항목 목록 조회
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

    // Verify ownership
    const { data: questionSet, error: setError } = await supabase
      .from('question_sets')
      .select('id')
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

    return NextResponse.json({ items: items || [] });
  } catch (error) {
    const { json, status } = errorResponse(error);
    logger.error('Question items fetch error', error, {
      questionSetId: id,
      durationMs: Date.now() - startTime,
    });
    return NextResponse.json(json, { status });
  }
}

/**
 * POST /api/question-sets/:id/items
 * 질문 항목 추가
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

    // Verify ownership
    const { data: questionSet, error: setError } = await supabase
      .from('question_sets')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (setError || !questionSet) {
      throw new NotFoundError('question set');
    }

    // Check item count
    const { count, error: countError } = await supabase
      .from('question_set_items')
      .select('id', { count: 'exact', head: true })
      .eq('question_set_id', id);

    if (countError) {
      logger.error('Question item count check failed', countError, {
        userId: user.id,
        questionSetId: id,
      });
      throw new DatabaseError('check question count');
    }

    if (count !== null && count >= MAX_QUESTIONS_PER_SET) {
      return NextResponse.json(
        { error: `최대 ${MAX_QUESTIONS_PER_SET}개의 질문만 추가할 수 있습니다` },
        { status: 400 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validatedData = validate(addQuestionItemSchema, body);

    // Get max order_index if not provided
    let orderIndex = validatedData.order_index;
    if (orderIndex === undefined) {
      const { data: maxItem } = await supabase
        .from('question_set_items')
        .select('order_index')
        .eq('question_set_id', id)
        .order('order_index', { ascending: false })
        .limit(1)
        .single();

      orderIndex = (maxItem?.order_index ?? -1) + 1;
    }

    // Create item
    const { data: item, error: createError } = await supabase
      .from('question_set_items')
      .insert({
        question_set_id: id,
        question_text: validatedData.question_text,
        order_index: orderIndex,
      })
      .select()
      .single();

    if (createError || !item) {
      logger.error('Question item creation failed', createError, {
        userId: user.id,
        questionSetId: id,
      });
      throw new DatabaseError('create question item');
    }

    // Update question set's updated_at
    await supabase
      .from('question_sets')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id);

    logger.info('Question item created', {
      itemId: item.id,
      questionSetId: id,
      userId: user.id,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    const { json, status } = errorResponse(error);
    logger.error('Question item creation error', error, {
      questionSetId: id,
      durationMs: Date.now() - startTime,
    });
    return NextResponse.json(json, { status });
  }
}

/**
 * PUT /api/question-sets/:id/items
 * 질문 순서 일괄 변경
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now();
  const { id } = await params;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    // Verify ownership
    const { data: questionSet, error: setError } = await supabase
      .from('question_sets')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (setError || !questionSet) {
      throw new NotFoundError('question set');
    }

    // Validate request body
    const body = await request.json();
    const validatedData = validate(reorderQuestionsSchema, body);

    // Update each item's order
    for (const { id: itemId, order_index } of validatedData.items) {
      const { error: updateError } = await supabase
        .from('question_set_items')
        .update({ order_index })
        .eq('id', itemId)
        .eq('question_set_id', id);

      if (updateError) {
        logger.error('Question item reorder failed', updateError, {
          itemId,
          questionSetId: id,
        });
        throw new DatabaseError('reorder question items');
      }
    }

    // Update question set's updated_at
    await supabase
      .from('question_sets')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id);

    // Fetch updated items
    const { data: items, error: fetchError } = await supabase
      .from('question_set_items')
      .select('*')
      .eq('question_set_id', id)
      .order('order_index', { ascending: true });

    if (fetchError) {
      throw new DatabaseError('fetch reordered items');
    }

    logger.info('Question items reordered', {
      questionSetId: id,
      userId: user.id,
      itemCount: validatedData.items.length,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ items: items || [] });
  } catch (error) {
    const { json, status } = errorResponse(error);
    logger.error('Question items reorder error', error, {
      questionSetId: id,
      durationMs: Date.now() - startTime,
    });
    return NextResponse.json(json, { status });
  }
}

/**
 * PATCH /api/question-sets/:id/items
 * 개별 질문 항목 수정 (body에 itemId 포함)
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

    // Verify ownership
    const { data: questionSet, error: setError } = await supabase
      .from('question_sets')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (setError || !questionSet) {
      throw new NotFoundError('question set');
    }

    // Get itemId from body
    const body = await request.json();
    const { itemId, ...updateData } = body;

    if (!itemId) {
      return NextResponse.json({ error: 'itemId is required' }, { status: 400 });
    }

    // Validate update data
    const validatedData = validate(updateQuestionItemSchema, updateData);

    // Check item exists
    const { data: existingItem, error: checkError } = await supabase
      .from('question_set_items')
      .select('id')
      .eq('id', itemId)
      .eq('question_set_id', id)
      .single();

    if (checkError || !existingItem) {
      throw new NotFoundError('question item');
    }

    // Update item
    const { data: updatedItem, error: updateError } = await supabase
      .from('question_set_items')
      .update(validatedData)
      .eq('id', itemId)
      .select()
      .single();

    if (updateError || !updatedItem) {
      logger.error('Question item update failed', updateError, {
        itemId,
        questionSetId: id,
      });
      throw new DatabaseError('update question item');
    }

    // Update question set's updated_at
    await supabase
      .from('question_sets')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id);

    logger.info('Question item updated', {
      itemId,
      questionSetId: id,
      userId: user.id,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ item: updatedItem });
  } catch (error) {
    const { json, status } = errorResponse(error);
    logger.error('Question item update error', error, {
      questionSetId: id,
      durationMs: Date.now() - startTime,
    });
    return NextResponse.json(json, { status });
  }
}

/**
 * DELETE /api/question-sets/:id/items
 * 개별 질문 항목 삭제 (body에 itemId 포함)
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

    // Verify ownership
    const { data: questionSet, error: setError } = await supabase
      .from('question_sets')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (setError || !questionSet) {
      throw new NotFoundError('question set');
    }

    // Get itemId from URL
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');

    if (!itemId) {
      return NextResponse.json({ error: 'itemId is required' }, { status: 400 });
    }

    // Check item exists
    const { data: existingItem, error: checkError } = await supabase
      .from('question_set_items')
      .select('id')
      .eq('id', itemId)
      .eq('question_set_id', id)
      .single();

    if (checkError || !existingItem) {
      throw new NotFoundError('question item');
    }

    // Delete item
    const { error: deleteError } = await supabase
      .from('question_set_items')
      .delete()
      .eq('id', itemId);

    if (deleteError) {
      logger.error('Question item deletion failed', deleteError, {
        itemId,
        questionSetId: id,
      });
      throw new DatabaseError('delete question item');
    }

    // Update question set's updated_at
    await supabase
      .from('question_sets')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id);

    logger.info('Question item deleted', {
      itemId,
      questionSetId: id,
      userId: user.id,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const { json, status } = errorResponse(error);
    logger.error('Question item deletion error', error, {
      questionSetId: id,
      durationMs: Date.now() - startTime,
    });
    return NextResponse.json(json, { status });
  }
}
