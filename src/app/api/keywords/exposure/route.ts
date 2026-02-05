import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateExposureTrend, toHeatmapData, type ExposureScore } from '@/services/exposure-scoring';
import type { ProviderType, TrendPeriod } from '@/types/database';
import {
  UnauthorizedError,
  NotFoundError,
  DatabaseError,
  errorResponse,
} from '@/lib/errors';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Validation schemas
const getExposureQuerySchema = z.object({
  brandId: z.string().uuid(),
  period: z.enum(['7d', '30d', '90d']).default('7d'),
  limit: z.coerce.number().min(1).max(50).default(10),
});

const getHistoryQuerySchema = z.object({
  brandId: z.string().uuid(),
  keyword: z.string().min(1),
  period: z.enum(['7d', '30d', '90d']).default('30d'),
});

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';

    if (action === 'history') {
      // Get keyword exposure history
      return handleHistoryRequest(supabase, user.id, searchParams);
    }

    if (action === 'heatmap') {
      // Get heatmap data
      return handleHeatmapRequest(supabase, user.id, searchParams);
    }

    // Default: list keyword exposures
    return handleListRequest(supabase, user.id, searchParams);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    const { json, status } = errorResponse(error);
    logger.error('Keyword exposure error', error, { durationMs: Date.now() - startTime });
    return NextResponse.json(json, { status });
  }
}

async function handleListRequest(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  searchParams: URLSearchParams
) {
  const params = getExposureQuerySchema.parse({
    brandId: searchParams.get('brandId'),
    period: searchParams.get('period') || '7d',
    limit: searchParams.get('limit') || 10,
  });

  // Verify brand ownership
  const { data: brand, error: brandError } = await supabase
    .from('brands')
    .select('id, keywords')
    .eq('id', params.brandId)
    .eq('user_id', userId)
    .single();

  if (brandError || !brand) {
    throw new NotFoundError('Brand');
  }

  // Get period date range
  const periodDays = { '7d': 7, '30d': 30, '90d': 90 }[params.period];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - periodDays);

  // Get latest keyword exposures
  const { data: exposures, error: exposureError } = await supabase
    .from('keyword_exposure')
    .select('*')
    .eq('brand_id', params.brandId)
    .gte('recorded_at', startDate.toISOString())
    .order('recorded_at', { ascending: false })
    .limit(params.limit * 10); // Get more to aggregate

  if (exposureError) {
    throw new DatabaseError('fetch keyword exposures');
  }

  // Group by keyword and get latest
  const keywordMap = new Map<string, typeof exposures[0]>();
  for (const exp of exposures || []) {
    if (!keywordMap.has(exp.keyword)) {
      keywordMap.set(exp.keyword, exp);
    }
  }

  // Convert to ExposureScore format
  const exposureScores: ExposureScore[] = Array.from(keywordMap.values())
    .slice(0, params.limit)
    .map(exp => ({
      keyword: exp.keyword,
      overallScore: exp.exposure_score,
      components: {
        mentionFrequency: Math.round(((exp.mention_count || 0) / 5) * 100), // Assume 5 providers max
        positionScore: exp.avg_position ? Math.round(100 - (exp.avg_position - 1) * 20) : 0,
        sentimentScore: calculateSentimentScore(exp.sentiment_distribution),
        prominenceScore: calculateProminenceScore(exp.prominence_breakdown),
      },
      breakdown: Object.entries(exp.provider_scores || {}).map(([provider, score]) => ({
        provider: provider as ProviderType,
        score: score as number,
        mentionCount: 1,
        avgPosition: null,
        sentiment: null,
        prominence: null,
      })),
      trend: calculateExposureTrend(
        exp.exposure_score,
        [], // Would need historical data
        params.period as TrendPeriod
      ),
    }));

  return NextResponse.json({
    exposures: exposureScores,
    brandKeywords: brand.keywords || [],
    period: params.period,
  });
}

async function handleHistoryRequest(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  searchParams: URLSearchParams
) {
  const params = getHistoryQuerySchema.parse({
    brandId: searchParams.get('brandId'),
    keyword: searchParams.get('keyword'),
    period: searchParams.get('period') || '30d',
  });

  // Verify brand ownership
  const { data: brand, error: brandError } = await supabase
    .from('brands')
    .select('id')
    .eq('id', params.brandId)
    .eq('user_id', userId)
    .single();

  if (brandError || !brand) {
    throw new NotFoundError('Brand');
  }

  // Get period date range
  const periodDays = { '7d': 7, '30d': 30, '90d': 90 }[params.period];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - periodDays);

  // Get historical data
  const { data: history, error: historyError } = await supabase
    .from('keyword_exposure')
    .select('recorded_at, exposure_score, mention_count, provider_scores')
    .eq('brand_id', params.brandId)
    .eq('keyword', params.keyword)
    .gte('recorded_at', startDate.toISOString())
    .order('recorded_at', { ascending: true });

  if (historyError) {
    throw new DatabaseError('fetch keyword history');
  }

  // Format for chart
  const chartData = (history || []).map(h => ({
    date: h.recorded_at,
    score: h.exposure_score,
    mentionCount: h.mention_count,
    providerScores: h.provider_scores,
  }));

  return NextResponse.json({
    keyword: params.keyword,
    period: params.period,
    history: chartData,
    summary: calculateHistorySummary(chartData),
  });
}

async function handleHeatmapRequest(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  searchParams: URLSearchParams
) {
  const params = getExposureQuerySchema.parse({
    brandId: searchParams.get('brandId'),
    period: searchParams.get('period') || '7d',
    limit: searchParams.get('limit') || 10,
  });

  // Verify brand ownership
  const { data: brand, error: brandError } = await supabase
    .from('brands')
    .select('id, keywords')
    .eq('id', params.brandId)
    .eq('user_id', userId)
    .single();

  if (brandError || !brand) {
    throw new NotFoundError('Brand');
  }

  // Get latest exposures
  const { data: exposures, error: exposureError } = await supabase
    .from('keyword_exposure')
    .select('*')
    .eq('brand_id', params.brandId)
    .order('recorded_at', { ascending: false })
    .limit(params.limit * 5);

  if (exposureError) {
    throw new DatabaseError('fetch exposures for heatmap');
  }

  // Group by keyword
  const keywordMap = new Map<string, typeof exposures[0]>();
  for (const exp of exposures || []) {
    if (!keywordMap.has(exp.keyword)) {
      keywordMap.set(exp.keyword, exp);
    }
  }

  // Get all providers we care about
  const providers: ProviderType[] = ['gemini', 'openai', 'anthropic', 'perplexity', 'grok'];

  // Build heatmap data
  const heatmapData = Array.from(keywordMap.values())
    .slice(0, params.limit)
    .map(exp => ({
      keyword: exp.keyword,
      providers: providers.map(provider => ({
        provider,
        score: (exp.provider_scores as Record<string, number>)?.[provider] || 0,
        trend: 'stable' as const,
      })),
      overallScore: exp.exposure_score,
      overallTrend: 'stable' as const,
    }));

  return NextResponse.json({
    heatmap: heatmapData,
    providers,
    period: params.period,
  });
}

function calculateSentimentScore(distribution: { positive?: number; neutral?: number; negative?: number } | null): number {
  if (!distribution) return 50;
  const total = (distribution.positive || 0) + (distribution.neutral || 0) + (distribution.negative || 0);
  if (total === 0) return 50;
  
  const weightedScore = 
    ((distribution.positive || 0) * 100 + 
     (distribution.neutral || 0) * 50 + 
     (distribution.negative || 0) * 0) / total;
  
  return Math.round(weightedScore);
}

function calculateProminenceScore(breakdown: Record<string, number> | null): number {
  if (!breakdown) return 30;
  
  const weights: Record<string, number> = {
    featured: 100,
    primary: 80,
    secondary: 50,
    mentioned: 30,
  };
  
  let totalScore = 0;
  let totalCount = 0;
  
  for (const [level, count] of Object.entries(breakdown)) {
    if (weights[level] && count > 0) {
      totalScore += weights[level] * count;
      totalCount += count;
    }
  }
  
  return totalCount > 0 ? Math.round(totalScore / totalCount) : 30;
}

function calculateHistorySummary(chartData: Array<{ score: number; mentionCount: number }>) {
  if (chartData.length === 0) {
    return {
      avgScore: 0,
      maxScore: 0,
      minScore: 0,
      totalMentions: 0,
      trend: 'stable' as const,
    };
  }

  const scores = chartData.map(d => d.score);
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  const totalMentions = chartData.reduce((sum, d) => sum + d.mentionCount, 0);

  // Calculate trend
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (chartData.length >= 2) {
    const firstHalf = chartData.slice(0, Math.floor(chartData.length / 2));
    const secondHalf = chartData.slice(Math.floor(chartData.length / 2));
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.score, 0) / secondHalf.length;
    
    if (secondAvg > firstAvg * 1.1) trend = 'up';
    else if (secondAvg < firstAvg * 0.9) trend = 'down';
  }

  return {
    avgScore,
    maxScore,
    minScore,
    totalMentions,
    trend,
  };
}
