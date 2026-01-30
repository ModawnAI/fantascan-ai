import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDefaultAlertConfigs } from '@/services/analytics';

// Get alert configurations
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');
    
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
    
    // Get existing configs
    const { data: configs, error: configError } = await supabase
      .from('alert_configs')
      .select('*')
      .eq('brand_id', brandId)
      .eq('user_id', user.id);
    
    if (configError) {
      console.error('Failed to fetch alert configs:', configError);
      return NextResponse.json(
        { error: '데이터를 불러오는데 실패했습니다' },
        { status: 500 }
      );
    }
    
    // If no configs exist, create defaults
    if (!configs || configs.length === 0) {
      const defaults = getDefaultAlertConfigs(user.id, brandId);
      
      const { data: newConfigs, error: insertError } = await supabase
        .from('alert_configs')
        .insert(defaults)
        .select();
      
      if (insertError) {
        console.error('Failed to create default configs:', insertError);
        return NextResponse.json(
          { error: '기본 설정 생성에 실패했습니다' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({ configs: newConfigs });
    }
    
    return NextResponse.json({ configs });
  } catch (error) {
    console.error('Alert config GET error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// Update alert configuration
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, is_active, threshold, channels, webhook_url } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'id가 필요합니다' },
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
    
    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    
    if (typeof is_active === 'boolean') {
      updateData.is_active = is_active;
    }
    if (threshold !== undefined) {
      updateData.threshold = threshold;
    }
    if (channels !== undefined) {
      updateData.channels = channels;
    }
    if (webhook_url !== undefined) {
      updateData.webhook_url = webhook_url;
    }
    
    // Update config (RLS will verify ownership)
    const { data: updated, error: updateError } = await supabase
      .from('alert_configs')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('Failed to update alert config:', updateError);
      return NextResponse.json(
        { error: '업데이트에 실패했습니다' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ config: updated });
  } catch (error) {
    console.error('Alert config PATCH error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// Create new alert configuration
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { brandId, alert_type, threshold, channels, webhook_url } = body;
    
    if (!brandId || !alert_type) {
      return NextResponse.json(
        { error: 'brandId와 alert_type이 필요합니다' },
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
    
    // Create config
    const { data: config, error: insertError } = await supabase
      .from('alert_configs')
      .insert({
        user_id: user.id,
        brand_id: brandId,
        alert_type,
        threshold: threshold || {},
        channels: channels || ['in_app'],
        webhook_url: webhook_url || null,
        is_active: true,
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('Failed to create alert config:', insertError);
      return NextResponse.json(
        { error: '설정 생성에 실패했습니다' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ config });
  } catch (error) {
    console.error('Alert config POST error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
