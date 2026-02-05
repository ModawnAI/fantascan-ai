/**
 * Exposure Scoring Types
 * Types for keyword exposure calculation and tracking
 */

import type { ProviderType, TrendPeriod } from '@/types/database';

export interface ExposureScoreComponents {
  mentionFrequency: number;  // 0-100, weight: 40%
  positionScore: number;     // 0-100, weight: 30%
  sentimentScore: number;    // 0-100, weight: 15%
  prominenceScore: number;   // 0-100, weight: 15%
}

export interface ExposureScore {
  keyword: string;
  overallScore: number;      // 0-100
  components: ExposureScoreComponents;
  breakdown: ProviderExposure[];
  trend: ExposureTrend;
}

export interface ProviderExposure {
  provider: ProviderType;
  score: number;             // 0-100
  mentionCount: number;
  avgPosition: number | null;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  prominence: ProminenceLevel | null;
}

export type ProminenceLevel = 'featured' | 'primary' | 'secondary' | 'mentioned';

export interface ExposureTrend {
  direction: 'up' | 'down' | 'stable';
  changePercent: number;
  period: TrendPeriod;
  previousScore: number | null;
}

export interface ExposureCalculationInput {
  keyword: string;
  brandId: string;
  results: ExposureDataPoint[];
}

export interface ExposureDataPoint {
  provider: ProviderType;
  mentioned: boolean;
  position?: number;           // 1 = first, higher = later
  sentiment?: 'positive' | 'neutral' | 'negative';
  prominence?: ProminenceLevel;
  responseContent?: string;
}

export interface KeywordExposureRecord {
  id?: string;
  brand_id: string;
  scan_id?: string;
  batch_scan_id?: string;
  keyword: string;
  exposure_score: number;
  mention_count: number;
  avg_position: number | null;
  sentiment_distribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  provider_scores: Record<string, number>;
  prominence_breakdown: Record<ProminenceLevel, number>;
  recorded_at: string;
  created_at?: string;
}

export interface KeywordHeatmapData {
  keyword: string;
  providers: Array<{
    provider: ProviderType;
    score: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  overallScore: number;
  overallTrend: 'up' | 'down' | 'stable';
}

export interface ExposureHistoryPoint {
  date: string;
  score: number;
  mentionCount: number;
}

export interface KeywordPerformanceComparison {
  keyword: string;
  currentScore: number;
  previousScore: number;
  change: number;
  changePercent: number;
  bestProvider: ProviderType | null;
  worstProvider: ProviderType | null;
}
