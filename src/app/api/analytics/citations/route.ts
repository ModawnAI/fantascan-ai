import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');
    const scanId = searchParams.get('scanId');
    const limit = parseInt(searchParams.get('limit') || '20');
    
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
    
    // Build query
    let query = supabase
      .from('citations')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (scanId) {
      query = query.eq('scan_id', scanId);
    }
    
    const { data: citations, error: citationsError } = await query;
    
    if (citationsError) {
      console.error('Failed to fetch citations:', citationsError);
      return NextResponse.json(
        { error: '데이터를 불러오는데 실패했습니다' },
        { status: 500 }
      );
    }
    
    // Group citations by domain
    const domainCounts: Record<string, number> = {};
    const providerCounts: Record<string, number> = {};
    
    (citations || []).forEach(c => {
      if (c.source_domain) {
        domainCounts[c.source_domain] = (domainCounts[c.source_domain] || 0) + 1;
      }
      providerCounts[c.provider] = (providerCounts[c.provider] || 0) + 1;
    });
    
    const topDomains = Object.entries(domainCounts)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    const byProvider = Object.entries(providerCounts)
      .map(([provider, count]) => ({ provider, count }))
      .sort((a, b) => b.count - a.count);
    
    return NextResponse.json({
      citations: citations || [],
      summary: {
        total: citations?.length || 0,
        topDomains,
        byProvider,
      },
    });
  } catch (error) {
    console.error('Citations API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
