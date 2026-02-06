import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UnauthorizedError, errorResponse } from '@/lib/errors';

/**
 * GET /api/user/credits
 * 사용자 크레딧 및 플랜 정보 조회
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    const { data: profile, error } = await supabase
      .from('users')
      .select('credits, plan')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      // If user doesn't exist in users table, return defaults
      return NextResponse.json({
        credits: 0,
        plan: 'free',
      });
    }

    return NextResponse.json({
      credits: profile.credits || 0,
      plan: profile.plan || 'free',
    });
  } catch (error) {
    const { json, status } = errorResponse(error);
    return NextResponse.json(json, { status });
  }
}
