import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateTrend, calculateProviderTrends, calculateSOVTrend } from '@/services/analytics';
import type { TrendPeriod, VisibilityHistory } from '@/types/database';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');
    const period = (searchParams.get('period') || '7d') as TrendPeriod;
    
    if (!brandId) {
      return NextResponse.json(
        { error: 'brandId 파라미터가 필요합니다' },
        { status: 400 }
      );
    }
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }
    
    // Verify brand ownership
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id')
      .eq('id', brandId)
      .eq('user_id', user.id)
      .single();
    
    if (brandError || !brand) {
      return NextResponse.json(
        { error: '브랜드를 찾을 수 없습니다' },
        { status: 404 }
      );
    }
    
    // Get period in days
    const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays * 2); // Get double period for comparison
    
    // Fetch visibility history
    const { data: history, error: historyError } = await supabase
      .from('visibility_history')
      .select('*')
      .eq('brand_id', brandId)
      .gte('recorded_at', startDate.toISOString())
      .order('recorded_at', { ascending: false });
    
    if (historyError) {
      console.error('Failed to fetch visibility history:', historyError);
      return NextResponse.json(
        { error: '데이터를 불러오는데 실패했습니다' },
        { status: 500 }
      );
    }
    
    // Calculate trends
    const visibilityHistory = (history || []) as VisibilityHistory[];
    
    const overallTrend = calculateTrend({
      history: visibilityHistory,
      period,
    });
    
    const providerTrends = calculateProviderTrends(visibilityHistory, period);
    const sovTrends = calculateSOVTrend(visibilityHistory, period);
    
    return NextResponse.json({
      overall: overallTrend,
      providers: providerTrends,
      competitors: sovTrends,
    });
  } catch (error) {
    console.error('Trends API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
