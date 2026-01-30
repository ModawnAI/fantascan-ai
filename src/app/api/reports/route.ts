import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateTextReport, generateHTMLReport, generateCSVExport, type ReportData } from '@/services/reports';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');
    const format = searchParams.get('format') || 'html'; // html, text, csv
    
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
    
    // Fetch brand
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .eq('user_id', user.id)
      .single();
    
    if (brandError || !brand) {
      return NextResponse.json(
        { error: '브랜드를 찾을 수 없습니다' },
        { status: 404 }
      );
    }
    
    // Fetch latest scan
    const { data: scan } = await supabase
      .from('scans')
      .select('*')
      .eq('brand_id', brandId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();
    
    if (!scan) {
      return NextResponse.json(
        { error: '완료된 스캔이 없습니다' },
        { status: 404 }
      );
    }
    
    // Fetch visibility history
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: history } = await supabase
      .from('visibility_history')
      .select('*')
      .eq('brand_id', brandId)
      .gte('recorded_at', thirtyDaysAgo.toISOString())
      .order('recorded_at', { ascending: false });
    
    // Fetch competitors
    const { data: competitors } = await supabase
      .from('competitor_analysis')
      .select('*')
      .eq('scan_id', scan.id);
    
    // Fetch recommendations
    const { data: recommendations } = await supabase
      .from('content_recommendations')
      .select('*')
      .eq('brand_id', brandId)
      .eq('status', 'pending')
      .order('priority', { ascending: true })
      .limit(10);
    
    // Fetch citations
    const { data: citations } = await supabase
      .from('citations')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })
      .limit(50);
    
    // Build report data
    const reportData: ReportData = {
      brand,
      scan,
      history: history || [],
      competitors: competitors || [],
      recommendations: recommendations || [],
      citations: citations || [],
      generatedAt: new Date().toISOString(),
    };
    
    // Generate report based on format
    switch (format) {
      case 'text': {
        const textReport = generateTextReport(reportData);
        return new NextResponse(textReport, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': `attachment; filename="${brand.name}_report_${new Date().toISOString().split('T')[0]}.txt"`,
          },
        });
      }
      
      case 'csv': {
        const csvReport = generateCSVExport(reportData);
        return new NextResponse(csvReport, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${brand.name}_data_${new Date().toISOString().split('T')[0]}.csv"`,
          },
        });
      }
      
      case 'html':
      default: {
        const htmlReport = generateHTMLReport(reportData);
        return new NextResponse(htmlReport, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
          },
        });
      }
    }
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { error: '보고서 생성에 실패했습니다' },
      { status: 500 }
    );
  }
}
