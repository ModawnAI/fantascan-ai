import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');
    const status = searchParams.get('status'); // pending, in_progress, completed, dismissed
    const limit = parseInt(searchParams.get('limit') || '10');
    
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
      .from('content_recommendations')
      .select('*')
      .eq('brand_id', brandId)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data: recommendations, error: recError } = await query;
    
    if (recError) {
      console.error('Failed to fetch recommendations:', recError);
      return NextResponse.json(
        { error: '데이터를 불러오는데 실패했습니다' },
        { status: 500 }
      );
    }
    
    // Group by type
    const byType: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    
    (recommendations || []).forEach(rec => {
      byType[rec.recommendation_type] = (byType[rec.recommendation_type] || 0) + 1;
      byPriority[rec.priority] = (byPriority[rec.priority] || 0) + 1;
    });
    
    return NextResponse.json({
      recommendations: recommendations || [],
      summary: {
        total: recommendations?.length || 0,
        byType,
        byPriority,
      },
    });
  } catch (error) {
    console.error('Recommendations API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// Update recommendation status
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body;
    
    if (!id || !status) {
      return NextResponse.json(
        { error: 'id와 status가 필요합니다' },
        { status: 400 }
      );
    }
    
    const validStatuses = ['pending', 'in_progress', 'completed', 'dismissed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: '유효하지 않은 상태입니다' },
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
    
    // Get recommendation and verify ownership
    const { data: rec, error: recError } = await supabase
      .from('content_recommendations')
      .select('brand_id')
      .eq('id', id)
      .single();
    
    if (recError || !rec) {
      return NextResponse.json(
        { error: '권장사항을 찾을 수 없습니다' },
        { status: 404 }
      );
    }
    
    // Verify brand ownership
    const { data: brand } = await supabase
      .from('brands')
      .select('id')
      .eq('id', rec.brand_id)
      .eq('user_id', user.id)
      .single();
    
    if (!brand) {
      return NextResponse.json(
        { error: '권한이 없습니다' },
        { status: 403 }
      );
    }
    
    // Update status
    const updateData: { status: string; completed_at?: string } = { status };
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }
    
    const { error: updateError } = await supabase
      .from('content_recommendations')
      .update(updateData)
      .eq('id', id);
    
    if (updateError) {
      console.error('Failed to update recommendation:', updateError);
      return NextResponse.json(
        { error: '업데이트에 실패했습니다' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Recommendations PATCH error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
