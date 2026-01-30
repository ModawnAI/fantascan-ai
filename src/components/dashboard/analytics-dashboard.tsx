'use client';

import { useState } from 'react';
import { useTrends, useShareOfVoice, useCitations, useRecommendations } from '@/hooks';
import { TrendChart, ShareOfVoiceChart, CitationsList, RecommendationsList, ExportButton } from '@/components/analytics';
import type { TrendPeriod } from '@/types/database';

interface AnalyticsDashboardProps {
  brandId: string;
}

export function AnalyticsDashboard({ brandId }: AnalyticsDashboardProps) {
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>('7d');
  
  // Fetch analytics data
  const { trends, isLoading: trendsLoading } = useTrends(brandId, trendPeriod);
  const { sov, isLoading: sovLoading } = useShareOfVoice(brandId);
  const { citations, summary: citationsSummary, isLoading: citationsLoading } = useCitations(brandId, { limit: 20 });
  const { recommendations, isLoading: recsLoading, updateStatus } = useRecommendations(brandId, { status: 'pending', limit: 5 });

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">분석 대시보드</h2>
        <ExportButton brandId={brandId} />
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <TrendChart
          trends={trends}
          isLoading={trendsLoading}
          selectedPeriod={trendPeriod}
          onPeriodChange={setTrendPeriod}
        />

        {/* Share of Voice */}
        <ShareOfVoiceChart
          brand={sov?.brand}
          competitors={sov?.competitors || []}
          isLoading={sovLoading}
        />
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Citations */}
        <CitationsList
          citations={citations}
          summary={citationsSummary}
          isLoading={citationsLoading}
        />

        {/* Recommendations */}
        <RecommendationsList
          recommendations={recommendations}
          isLoading={recsLoading}
          onUpdateStatus={updateStatus}
        />
      </div>
    </div>
  );
}
