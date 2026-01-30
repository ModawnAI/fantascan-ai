import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');
    const scanId = searchParams.get('scanId');
    
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
      .select('id, name, competitors')
      .eq('id', brandId)
      .eq('user_id', user.id)
      .single();
    
    if (brandError || !brand) {
      return NextResponse.json(
        { error: '브랜드를 찾을 수 없습니다' },
        { status: 404 }
      );
    }
    
    // Get competitor analysis for the specified or latest scan
    let query = supabase
      .from('competitor_analysis')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false });
    
    if (scanId) {
      query = query.eq('scan_id', scanId);
    }
    
    const { data: competitorAnalysis, error: caError } = await query.limit(10);
    
    if (caError) {
      console.error('Failed to fetch competitor analysis:', caError);
      return NextResponse.json(
        { error: '데이터를 불러오는데 실패했습니다' },
        { status: 500 }
      );
    }
    
    // Get the latest scan result to calculate brand SOV
    const { data: latestScan } = await supabase
      .from('scans')
      .select('id, visibility_score, mentions_count, total_providers')
      .eq('brand_id', brandId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();
    
    // Calculate total mentions including brand
    const brandMentions = latestScan?.mentions_count || 0;
    const competitorMentions = (competitorAnalysis || []).reduce(
      (sum, ca) => sum + ca.mentions_count,
      0
    );
    const totalMentions = brandMentions + competitorMentions;
    
    // Build SOV data
    const brandSOV = {
      name: brand.name,
      percentage: totalMentions > 0 
        ? Math.round((brandMentions / totalMentions) * 100 * 10) / 10
        : 0,
      mentionsCount: brandMentions,
      isBrand: true,
    };
    
    const competitorSOV = (competitorAnalysis || []).map(ca => ({
      name: ca.competitor_name,
      percentage: totalMentions > 0
        ? Math.round((ca.mentions_count / totalMentions) * 100 * 10) / 10
        : 0,
      mentionsCount: ca.mentions_count,
      visibilityScore: ca.visibility_score,
      averagePosition: ca.average_position,
      sentiment: {
        positive: ca.sentiment_positive,
        neutral: ca.sentiment_neutral,
        negative: ca.sentiment_negative,
      },
      isBrand: false,
    }));
    
    // Get historical SOV for trend
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: historicalSOV } = await supabase
      .from('visibility_history')
      .select('recorded_at, competitor_sov')
      .eq('brand_id', brandId)
      .gte('recorded_at', thirtyDaysAgo.toISOString())
      .order('recorded_at', { ascending: true });
    
    return NextResponse.json({
      brand: brandSOV,
      competitors: competitorSOV,
      total: {
        entities: 1 + competitorSOV.length,
        mentions: totalMentions,
      },
      history: historicalSOV || [],
    });
  } catch (error) {
    console.error('SOV API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
