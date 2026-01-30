import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Get alerts for user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }
    
    // Build query
    let query = supabase
      .from('alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('triggered_at', { ascending: false })
      .limit(limit);
    
    if (brandId) {
      query = query.eq('brand_id', brandId);
    }
    
    if (unreadOnly) {
      query = query.eq('is_read', false);
    }
    
    const { data: alerts, error: alertsError } = await query;
    
    if (alertsError) {
      console.error('Failed to fetch alerts:', alertsError);
      return NextResponse.json(
        { error: '데이터를 불러오는데 실패했습니다' },
        { status: 500 }
      );
    }
    
    // Get unread count
    const { count: unreadCount } = await supabase
      .from('alerts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    
    return NextResponse.json({
      alerts: alerts || [],
      unreadCount: unreadCount || 0,
    });
  } catch (error) {
    console.error('Alerts GET error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// Mark alerts as read
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { alertIds, markAllRead } = body;
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }
    
    if (markAllRead) {
      // Mark all alerts as read
      const { error } = await supabase
        .from('alerts')
        .update({ is_read: true, acknowledged_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('is_read', false);
      
      if (error) {
        console.error('Failed to mark all alerts read:', error);
        return NextResponse.json(
          { error: '업데이트에 실패했습니다' },
          { status: 500 }
        );
      }
    } else if (alertIds && alertIds.length > 0) {
      // Mark specific alerts as read
      const { error } = await supabase
        .from('alerts')
        .update({ is_read: true, acknowledged_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .in('id', alertIds);
      
      if (error) {
        console.error('Failed to mark alerts read:', error);
        return NextResponse.json(
          { error: '업데이트에 실패했습니다' },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Alerts PATCH error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
