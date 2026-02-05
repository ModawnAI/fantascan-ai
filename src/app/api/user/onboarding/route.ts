import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TOUR_VERSION } from '@/lib/onboarding';

// GET - Check onboarding status
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const { data: onboarding, error } = await supabase
      .from('user_onboarding')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      console.error('Failed to fetch onboarding status:', error);
      return NextResponse.json({ error: '상태 조회 실패' }, { status: 500 });
    }

    // If no record exists, create one
    if (!onboarding) {
      const { data: newOnboarding, error: insertError } = await supabase
        .from('user_onboarding')
        .insert({
          user_id: user.id,
          tour_version: TOUR_VERSION,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Failed to create onboarding record:', insertError);
        return NextResponse.json({ error: '초기화 실패' }, { status: 500 });
      }

      return NextResponse.json({
        completed: false,
        completedAt: null,
        lastViewedAt: newOnboarding.last_viewed_at,
        tourVersion: newOnboarding.tour_version,
        skipped: false,
        completedTours: [],
      });
    }

    return NextResponse.json({
      completed: !!onboarding.completed_at,
      completedAt: onboarding.completed_at,
      lastViewedAt: onboarding.last_viewed_at,
      tourVersion: onboarding.tour_version,
      skipped: onboarding.skipped,
      completedTours: onboarding.completed_tours || [],
    });
  } catch (error) {
    console.error('Onboarding GET error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

// POST - Mark onboarding as complete (or specific tour)
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { tourId, skip } = body as { tourId?: string; skip?: boolean };

    // Get current status
    const { data: current } = await supabase
      .from('user_onboarding')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const completedTours = current?.completed_tours || [];

    // If specific tour completed
    if (tourId && !completedTours.includes(tourId)) {
      completedTours.push(tourId);
    }

    // Check if all tours are completed
    const allTours = ['dashboard', 'scan', 'results', 'settings'];
    const allCompleted = allTours.every((t) => completedTours.includes(t));

    const updateData = {
      completed_at: allCompleted ? new Date().toISOString() : null,
      last_viewed_at: new Date().toISOString(),
      skipped: skip ?? current?.skipped ?? false,
      completed_tours: completedTours,
    };

    const { error } = await supabase
      .from('user_onboarding')
      .upsert({
        user_id: user.id,
        ...updateData,
        tour_version: TOUR_VERSION,
      });

    if (error) {
      console.error('Failed to update onboarding:', error);
      return NextResponse.json({ error: '업데이트 실패' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      completed: allCompleted,
      completedTours,
    });
  } catch (error) {
    console.error('Onboarding POST error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

// PUT - Reset onboarding (for re-viewing)
export async function PUT() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const { error } = await supabase
      .from('user_onboarding')
      .upsert({
        user_id: user.id,
        completed_at: null,
        last_viewed_at: new Date().toISOString(),
        tour_version: TOUR_VERSION,
        skipped: false,
        completed_tours: [],
      });

    if (error) {
      console.error('Failed to reset onboarding:', error);
      return NextResponse.json({ error: '초기화 실패' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '온보딩이 초기화되었습니다',
    });
  } catch (error) {
    console.error('Onboarding PUT error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
