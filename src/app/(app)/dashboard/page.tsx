import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { VisibilityScore } from '@/components/dashboard/visibility-score';
import { ProviderGrid } from '@/components/dashboard/provider-grid';
import { QueryTemplates } from '@/components/dashboard/query-templates';
import { QuickInsights } from '@/components/dashboard/quick-insights';
import { RecentScans } from '@/components/dashboard/recent-scans';
import { AnalyticsDashboard } from '@/components/dashboard/analytics-dashboard';
import { KeywordHeatmap } from '@/components/dashboard/keyword-heatmap';
import { VisibilityTimeline } from '@/components/dashboard/visibility-timeline';
import { BenchmarkComparison } from '@/components/dashboard/benchmark-comparison';
import type { ProviderType } from '@/types/database';

export const metadata: Metadata = {
  title: '대시보드 - 판타스캔 AI',
  description: 'AI 가시성 모니터링 대시보드',
};

// Industry display names for Korean
const INDUSTRY_NAMES: Record<string, string> = {
  fintech: '핀테크',
  ecommerce: '이커머스',
  saas: 'SaaS',
  education: '교육',
  healthcare: '헬스케어',
  fnb: '식품/외식',
  beauty: '뷰티',
  travel: '여행',
  realestate: '부동산',
  other: '기타',
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user's primary brand
  const { data: brand } = await supabase
    .from('brands')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_primary', true)
    .single();

  if (!brand) {
    redirect('/onboarding');
  }

  // Get user profile with credits
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  // Get latest scan with results
  const { data: latestScan } = await supabase
    .from('scans')
    .select(`
      *,
      insights (*),
      scan_results (*)
    `)
    .eq('brand_id', brand.id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1)
    .single();

  // Get recent scans
  const { data: recentScans } = await supabase
    .from('scans')
    .select('*')
    .eq('brand_id', brand.id)
    .order('created_at', { ascending: false })
    .limit(5);

  // Get query templates for the brand's industry
  const { data: templates } = await supabase
    .from('query_templates')
    .select('*')
    .eq('industry', brand.industry)
    .eq('is_active', true);

  // Calculate provider scores from scan_results
  // Score is 100 if brand mentioned, 0 if not
  const providerScores: Record<string, number> = {};
  if (latestScan?.scan_results) {
    for (const result of latestScan.scan_results) {
      if (result.status === 'success') {
        providerScores[result.provider] = result.brand_mentioned ? 100 : 0;
      }
    }
  }

  // Get insights for quick insights component
  const insights = latestScan?.insights || [];
  const strengths = insights.filter((i: { insight_type: string }) => i.insight_type === 'strength');
  const weaknesses = insights.filter((i: { insight_type: string }) => i.insight_type === 'threat' || i.insight_type === 'improvement');
  const recommendations = insights.filter((i: { insight_type: string }) => i.insight_type === 'opportunity');

  // Get visibility history for timeline (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: visibilityHistory } = await supabase
    .from('visibility_history')
    .select('*')
    .eq('brand_id', brand.id)
    .gte('recorded_at', thirtyDaysAgo.toISOString())
    .order('recorded_at', { ascending: true });

  // Transform visibility history to timeline data
  const timelineData = (visibilityHistory || []).map(h => ({
    date: h.recorded_at,
    overallScore: h.visibility_score || 0,
    aiScore: h.ai_visibility_score || 0,
    seoScore: h.seo_visibility_score || 0,
  }));

  // Get keyword exposures for heatmap
  const { data: keywordExposures } = await supabase
    .from('keyword_exposure')
    .select('*')
    .eq('brand_id', brand.id)
    .order('recorded_at', { ascending: false })
    .limit(50);

  // Type for keyword exposure records
  type KeywordExposureRecord = {
    keyword: string;
    exposure_score: number | null;
    provider_scores: Record<string, number> | null;
    recorded_at: string;
  };

  // Group keyword exposures and get latest per keyword
  const keywordMap = new Map<string, KeywordExposureRecord>();
  for (const exp of (keywordExposures || []) as KeywordExposureRecord[]) {
    if (!keywordMap.has(exp.keyword)) {
      keywordMap.set(exp.keyword, exp);
    }
  }

  // Transform to heatmap data
  const heatmapData = Array.from(keywordMap.values())
    .slice(0, 10)
    .map(exp => {
      const providerScoresObj = (exp.provider_scores || {}) as Record<ProviderType, number>;
      const providers: ProviderType[] = ['openai', 'gemini', 'anthropic', 'perplexity', 'grok'];
      
      return {
        keyword: exp.keyword,
        providers: providers.map(p => ({
          provider: p,
          score: providerScoresObj[p] || 0,
          trend: 'stable' as const,
        })),
        overallScore: exp.exposure_score || 0,
        overallTrend: 'stable' as const,
      };
    });

  // Get benchmark data (industry averages)
  // For now, use simulated data based on industry
  const benchmarkData = latestScan ? {
    brandScore: latestScan.visibility_score || 0,
    industryAverage: 45,
    industryTop10: 85,
    industryTop25: 70,
    industryTop50: 55,
    competitorScores: (brand.competitors || []).slice(0, 5).map((c: string) => ({
      name: c,
      score: Math.floor(Math.random() * 60) + 20, // Simulated scores
    })),
    percentileRank: latestScan.visibility_score 
      ? Math.max(1, Math.min(100, 100 - latestScan.visibility_score))
      : 50,
  } : null;

  return (
    <>
      <DashboardHeader
        brandName={brand.name}
        brandId={brand.id}
        credits={profile?.credits || 0}
        tier={profile?.plan || 'free'}
      />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Top Row: Visibility Score + Provider Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <VisibilityScore
            score={latestScan?.visibility_score ?? null}
            trend={null}
            lastScanAt={latestScan?.completed_at || null}
            aiScore={latestScan?.ai_visibility_score ?? null}
            seoScore={latestScan?.seo_visibility_score ?? null}
            mentionsCount={latestScan?.mentions_count ?? null}
            totalProviders={latestScan?.total_providers ?? null}
          />
          <div className="lg:col-span-2">
            <ProviderGrid
              providerScores={Object.keys(providerScores).length > 0 ? providerScores as Record<import('@/types/database').ProviderType, number> : null}
              brandId={brand.id}
            />
          </div>
        </div>

        {/* Visibility Timeline (Full Width) */}
        <VisibilityTimeline
          data={timelineData}
          period="30d"
          isLoading={false}
        />

        {/* Keywords and Benchmark Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <KeywordHeatmap
            data={heatmapData}
            isLoading={false}
          />
          <BenchmarkComparison
            data={benchmarkData}
            industryName={INDUSTRY_NAMES[brand.industry] || brand.industry}
            isLoading={false}
          />
        </div>

        {/* Middle Row: Quick Insights + Query Templates */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <QuickInsights
            strengths={strengths.map((i: { description: string }) => i.description)}
            weaknesses={weaknesses.map((i: { description: string }) => i.description)}
            recommendations={recommendations.map((i: { description: string }) => i.description)}
          />
          <QueryTemplates
            templates={templates || []}
            brandId={brand.id}
            brandName={brand.name}
          />
        </div>

        {/* Analytics Section */}
        <AnalyticsDashboard brandId={brand.id} />

        {/* Bottom Row: Recent Scans */}
        <RecentScans scans={recentScans || []} />
      </main>
    </>
  );
}
