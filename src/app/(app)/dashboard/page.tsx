import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { VisibilityExposure } from '@/components/dashboard/visibility-exposure';
import { QuestionExposureList } from '@/components/dashboard/question-exposure-list';
import { QuickInsights } from '@/components/dashboard/quick-insights';
import { RecentBatchScans } from '@/components/dashboard/recent-batch-scans';
import { VisibilityTimeline } from '@/components/dashboard/visibility-timeline';
import { CompetitorSOV } from '@/components/dashboard/competitor-sov';

export const metadata: Metadata = {
  title: '대시보드 - 판타스캔 AI',
  description: 'AI 가시성 모니터링 대시보드',
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

  // Get latest completed batch scan (v2)
  const { data: latestBatchScan } = await supabase
    .from('batch_scans_v2')
    .select(`
      *,
      batch_scan_questions (*)
    `)
    .eq('brand_id', brand.id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1)
    .single();

  // Get recent batch scans
  const { data: recentBatchScans } = await supabase
    .from('batch_scans_v2')
    .select(`
      id,
      status,
      total_questions,
      completed_questions,
      total_iterations,
      completed_iterations,
      overall_exposure_rate,
      created_at,
      completed_at,
      question_sets (name)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  // Calculate overall exposure rate from questions
  const questions = latestBatchScan?.batch_scan_questions || [];
  const overallExposureRate = questions.length > 0
    ? questions.reduce((sum: number, q: { avg_exposure_rate: number | null }) => 
        sum + (q.avg_exposure_rate || 0), 0) / questions.length
    : null;

  // Get visibility history for timeline (last 30 days)
  // Using batch scans data for timeline
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: batchScanHistory } = await supabase
    .from('batch_scans_v2')
    .select('id, overall_exposure_rate, completed_at, question_set_id')
    .eq('brand_id', brand.id)
    .eq('status', 'completed')
    .gte('completed_at', thirtyDaysAgo.toISOString())
    .order('completed_at', { ascending: true });

  // Transform to timeline data
  const timelineData = (batchScanHistory || []).map(scan => ({
    date: scan.completed_at,
    exposureRate: scan.overall_exposure_rate || 0,
    questionSetId: scan.question_set_id,
  }));

  // Get competitor SOV from latest scan
  // Aggregate competitor mentions across all questions
  const competitorMentions: Record<string, number> = {};
  const configuredCompetitors = brand.competitors || [];
  
  for (const question of questions) {
    const mentions = (question.competitor_mentions || {}) as Record<string, number>;
    for (const [competitor, count] of Object.entries(mentions)) {
      // Only include configured competitors
      if (configuredCompetitors.includes(competitor)) {
        competitorMentions[competitor] = (competitorMentions[competitor] || 0) + count;
      }
    }
  }

  // Calculate brand total mentions
  const brandMentions = questions.reduce((sum: number, q: { gemini_mention_count: number, openai_mention_count: number }) => 
    sum + (q.gemini_mention_count || 0) + (q.openai_mention_count || 0), 0);

  // Total iterations for SOV calculation
  const totalIterations = latestBatchScan?.completed_iterations || 0;

  // Get insights from scan (simplified recommendations)
  const insights = generateSimpleInsights(
    overallExposureRate,
    brandMentions,
    competitorMentions,
    totalIterations,
    configuredCompetitors
  );

  return (
    <>
      <DashboardHeader
        brandName={brand.name}
        brandId={brand.id}
        credits={profile?.credits || 0}
        tier={profile?.plan || 'free'}
      />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Top Row: AI 가시성 노출도 + 경쟁사 점유율 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <VisibilityExposure
            exposureRate={overallExposureRate}
            lastScanAt={latestBatchScan?.completed_at || null}
            totalQuestions={questions.length}
            totalIterations={totalIterations}
          />
          <div className="lg:col-span-2">
            <CompetitorSOV
              brandName={brand.name}
              brandMentions={brandMentions}
              competitorMentions={competitorMentions}
              totalIterations={totalIterations}
              configuredCompetitors={configuredCompetitors}
            />
          </div>
        </div>

        {/* 가시성 추이 (질문 세트 기준) */}
        <VisibilityTimeline
          data={timelineData}
          period="30d"
          isLoading={false}
          mode="exposure"
        />

        {/* 질문별 노출도 */}
        <QuestionExposureList
          questions={questions.map((q: {
            id: string;
            question_text: string;
            avg_exposure_rate: number | null;
            gemini_exposure_rate: number | null;
            openai_exposure_rate: number | null;
            gemini_mention_count: number;
            openai_mention_count: number;
            competitor_mentions: Record<string, number>;
          }) => ({
            id: q.id,
            questionText: q.question_text,
            avgExposureRate: q.avg_exposure_rate,
            geminiExposureRate: q.gemini_exposure_rate,
            openaiExposureRate: q.openai_exposure_rate,
            geminiMentions: q.gemini_mention_count,
            openaiMentions: q.openai_mention_count,
            competitorMentions: q.competitor_mentions,
          }))}
          brandName={brand.name}
          configuredCompetitors={configuredCompetitors}
        />

        {/* 개선 권장사항 (간단 버전) */}
        {insights.recommendations.length > 0 && (
          <QuickInsights
            strengths={insights.strengths}
            weaknesses={insights.weaknesses}
            recommendations={insights.recommendations}
          />
        )}

        {/* 최근 스캔 히스토리 */}
        <RecentBatchScans scans={recentBatchScans || []} />
      </main>
    </>
  );
}

// 간단한 인사이트 생성 함수
function generateSimpleInsights(
  exposureRate: number | null,
  brandMentions: number,
  competitorMentions: Record<string, number>,
  totalIterations: number,
  configuredCompetitors: string[]
): { strengths: string[]; weaknesses: string[]; recommendations: string[] } {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  if (exposureRate === null || totalIterations === 0) {
    return { strengths, weaknesses, recommendations };
  }

  // Calculate brand SOV
  const brandSOV = totalIterations > 0 ? (brandMentions / totalIterations) * 100 : 0;

  // Find competitors with higher SOV
  const competitorsAhead: { name: string; sov: number }[] = [];
  for (const competitor of configuredCompetitors) {
    const mentions = competitorMentions[competitor] || 0;
    const competitorSOV = totalIterations > 0 ? (mentions / totalIterations) * 100 : 0;
    if (competitorSOV > brandSOV) {
      competitorsAhead.push({ name: competitor, sov: competitorSOV });
    }
  }

  // Generate insights
  if (exposureRate >= 50) {
    strengths.push(`AI 가시성 노출도 ${exposureRate.toFixed(1)}%로 양호한 수준입니다.`);
  } else if (exposureRate >= 30) {
    weaknesses.push(`AI 가시성 노출도가 ${exposureRate.toFixed(1)}%로 개선이 필요합니다.`);
  } else {
    weaknesses.push(`AI 가시성 노출도가 ${exposureRate.toFixed(1)}%로 매우 낮습니다.`);
  }

  // Recommendations based on competitors
  if (competitorsAhead.length > 0) {
    const topCompetitor = competitorsAhead.sort((a, b) => b.sov - a.sov)[0];
    recommendations.push(
      `${topCompetitor.name}의 AI 노출도(${topCompetitor.sov.toFixed(1)}%)가 높습니다. 해당 경쟁사의 콘텐츠 전략을 분석해보세요.`
    );
  }

  if (exposureRate < 30) {
    recommendations.push('브랜드 관련 키워드를 포함한 콘텐츠를 더 많이 생성하세요.');
  }

  return { strengths, weaknesses, recommendations };
}
