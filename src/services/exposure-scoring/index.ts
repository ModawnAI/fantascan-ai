/**
 * Keyword Exposure Scoring Service
 * Calculates and tracks keyword visibility across AI providers
 */

import type { ProviderType, TrendPeriod } from '@/types/database';
import type {
  ExposureScore,
  ExposureScoreComponents,
  ExposureCalculationInput,
  ExposureDataPoint,
  ProviderExposure,
  ExposureTrend,
  ProminenceLevel,
  KeywordHeatmapData,
  KeywordPerformanceComparison,
} from './types';

// Re-export types
export type {
  ExposureScore,
  ExposureScoreComponents,
  ExposureCalculationInput,
  ExposureDataPoint,
  ProviderExposure,
  ExposureTrend,
  ProminenceLevel,
  KeywordHeatmapData,
  KeywordPerformanceComparison,
};

// Score weights
const WEIGHTS = {
  mentionFrequency: 0.40,
  positionScore: 0.30,
  sentimentScore: 0.15,
  prominenceScore: 0.15,
};

// Position score mapping (position -> score)
const POSITION_SCORES: Record<number, number> = {
  1: 100,
  2: 80,
  3: 60,
  4: 40,
  5: 20,
};

// Sentiment score mapping
const SENTIMENT_SCORES: Record<string, number> = {
  positive: 100,
  neutral: 50,
  negative: 0,
};

// Prominence score mapping
const PROMINENCE_SCORES: Record<ProminenceLevel, number> = {
  featured: 100,
  primary: 80,
  secondary: 50,
  mentioned: 30,
};

/**
 * Calculate position score from position number
 */
function calculatePositionScore(positions: (number | undefined)[]): number {
  const validPositions = positions.filter((p): p is number => p !== undefined);
  if (validPositions.length === 0) return 0;
  
  const scores = validPositions.map(p => {
    if (p <= 0) return 0;
    if (p >= 5) return 20;
    return POSITION_SCORES[p] || Math.max(20, 100 - (p - 1) * 20);
  });
  
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/**
 * Calculate sentiment score from sentiments
 */
function calculateSentimentScore(sentiments: (string | undefined)[]): number {
  const validSentiments = sentiments.filter((s): s is string => s !== undefined);
  if (validSentiments.length === 0) return 50; // Default to neutral
  
  const scores = validSentiments.map(s => SENTIMENT_SCORES[s] ?? 50);
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/**
 * Calculate prominence score from prominence levels
 */
function calculateProminenceScore(prominences: (ProminenceLevel | undefined)[]): number {
  const validProminences = prominences.filter((p): p is ProminenceLevel => p !== undefined);
  if (validProminences.length === 0) return 30; // Default to 'mentioned' level
  
  const scores = validProminences.map(p => PROMINENCE_SCORES[p] || 30);
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/**
 * Calculate overall exposure score for a keyword
 */
export function calculateExposureScore(
  input: ExposureCalculationInput
): ExposureScore {
  const { keyword, results } = input;
  
  if (results.length === 0) {
    return createEmptyScore(keyword);
  }
  
  // Filter to only include results where brand was mentioned
  const mentionedResults = results.filter(r => r.mentioned);
  const totalProviders = results.length;
  const mentionedProviders = mentionedResults.length;
  
  // Calculate mention frequency (0-100)
  const mentionFrequency = totalProviders > 0
    ? (mentionedProviders / totalProviders) * 100
    : 0;
  
  // Calculate position score (0-100)
  const positionScore = calculatePositionScore(
    mentionedResults.map(r => r.position)
  );
  
  // Calculate sentiment score (0-100)
  const sentimentScore = calculateSentimentScore(
    mentionedResults.map(r => r.sentiment)
  );
  
  // Calculate prominence score (0-100)
  const prominenceScore = calculateProminenceScore(
    mentionedResults.map(r => r.prominence)
  );
  
  // Calculate weighted overall score
  const overallScore = Math.round(
    mentionFrequency * WEIGHTS.mentionFrequency +
    positionScore * WEIGHTS.positionScore +
    sentimentScore * WEIGHTS.sentimentScore +
    prominenceScore * WEIGHTS.prominenceScore
  );
  
  // Calculate provider breakdown
  const breakdown = calculateProviderBreakdown(results);
  
  return {
    keyword,
    overallScore,
    components: {
      mentionFrequency: Math.round(mentionFrequency),
      positionScore: Math.round(positionScore),
      sentimentScore: Math.round(sentimentScore),
      prominenceScore: Math.round(prominenceScore),
    },
    breakdown,
    trend: {
      direction: 'stable',
      changePercent: 0,
      period: '7d',
      previousScore: null,
    },
  };
}

/**
 * Calculate per-provider exposure breakdown
 */
function calculateProviderBreakdown(results: ExposureDataPoint[]): ProviderExposure[] {
  const providerMap = new Map<ProviderType, ExposureDataPoint[]>();
  
  // Group results by provider
  for (const result of results) {
    const existing = providerMap.get(result.provider) || [];
    existing.push(result);
    providerMap.set(result.provider, existing);
  }
  
  // Calculate per-provider scores
  const breakdown: ProviderExposure[] = [];
  
  for (const [provider, providerResults] of providerMap) {
    const mentioned = providerResults.filter(r => r.mentioned);
    const mentionRate = providerResults.length > 0
      ? (mentioned.length / providerResults.length) * 100
      : 0;
    
    const positions = mentioned.map(r => r.position).filter((p): p is number => p !== undefined);
    const avgPosition = positions.length > 0
      ? positions.reduce((a, b) => a + b, 0) / positions.length
      : null;
    
    // Determine dominant sentiment
    type SentimentType = 'positive' | 'neutral' | 'negative';
    const sentiments = mentioned
      .map(r => r.sentiment)
      .filter((s): s is SentimentType => s === 'positive' || s === 'neutral' || s === 'negative');
    let sentiment: SentimentType | null = null;
    if (sentiments.length > 0) {
      const counts: Record<SentimentType, number> = { positive: 0, neutral: 0, negative: 0 };
      for (const s of sentiments) {
        counts[s]++;
      }
      sentiment = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as SentimentType;
    }
    
    // Determine dominant prominence
    const prominences = mentioned.map(r => r.prominence).filter((p): p is ProminenceLevel => p !== undefined);
    let prominence: ProminenceLevel | null = null;
    if (prominences.length > 0) {
      const counts: Record<string, number> = {};
      for (const p of prominences) {
        counts[p] = (counts[p] || 0) + 1;
      }
      prominence = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as ProminenceLevel;
    }
    
    breakdown.push({
      provider,
      score: Math.round(mentionRate),
      mentionCount: mentioned.length,
      avgPosition,
      sentiment,
      prominence,
    });
  }
  
  return breakdown.sort((a, b) => b.score - a.score);
}

/**
 * Create empty score for keyword with no data
 */
function createEmptyScore(keyword: string): ExposureScore {
  return {
    keyword,
    overallScore: 0,
    components: {
      mentionFrequency: 0,
      positionScore: 0,
      sentimentScore: 50,
      prominenceScore: 0,
    },
    breakdown: [],
    trend: {
      direction: 'stable',
      changePercent: 0,
      period: '7d',
      previousScore: null,
    },
  };
}

/**
 * Calculate trend from historical scores
 */
export function calculateExposureTrend(
  currentScore: number,
  historicalScores: Array<{ date: string; score: number }>,
  period: TrendPeriod = '7d'
): ExposureTrend {
  if (historicalScores.length === 0) {
    return {
      direction: 'stable',
      changePercent: 0,
      period,
      previousScore: null,
    };
  }
  
  // Sort by date descending
  const sorted = [...historicalScores].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  // Get comparison score based on period
  const periodDays = { '7d': 7, '30d': 30, '90d': 90 }[period];
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - periodDays);
  
  const previousScore = sorted.find(s => new Date(s.date) <= cutoffDate)?.score;
  
  if (previousScore === undefined) {
    return {
      direction: 'stable',
      changePercent: 0,
      period,
      previousScore: null,
    };
  }
  
  const change = currentScore - previousScore;
  const changePercent = previousScore > 0
    ? Math.round((change / previousScore) * 100)
    : (currentScore > 0 ? 100 : 0);
  
  let direction: 'up' | 'down' | 'stable';
  if (Math.abs(changePercent) < 5) {
    direction = 'stable';
  } else {
    direction = change > 0 ? 'up' : 'down';
  }
  
  return {
    direction,
    changePercent,
    period,
    previousScore,
  };
}

/**
 * Convert exposure scores to heatmap format
 */
export function toHeatmapData(
  exposureScores: ExposureScore[],
  providers: ProviderType[]
): KeywordHeatmapData[] {
  return exposureScores.map(score => ({
    keyword: score.keyword,
    providers: providers.map(provider => {
      const providerData = score.breakdown.find(b => b.provider === provider);
      return {
        provider,
        score: providerData?.score || 0,
        trend: score.trend.direction, // Use overall trend for now
      };
    }),
    overallScore: score.overallScore,
    overallTrend: score.trend.direction,
  }));
}

/**
 * Get score tier label
 */
export function getScoreTier(score: number): {
  tier: 'excellent' | 'good' | 'fair' | 'poor';
  label: string;
  color: string;
} {
  if (score >= 80) {
    return { tier: 'excellent', label: '우수', color: 'text-green-400' };
  }
  if (score >= 60) {
    return { tier: 'good', label: '양호', color: 'text-blue-400' };
  }
  if (score >= 40) {
    return { tier: 'fair', label: '보통', color: 'text-yellow-400' };
  }
  return { tier: 'poor', label: '미흡', color: 'text-red-400' };
}

/**
 * Compare keyword performance across time periods
 */
export function compareKeywordPerformance(
  current: ExposureScore,
  previous: ExposureScore | null
): KeywordPerformanceComparison {
  const currentScore = current.overallScore;
  const previousScore = previous?.overallScore || 0;
  const change = currentScore - previousScore;
  const changePercent = previousScore > 0
    ? Math.round((change / previousScore) * 100)
    : (currentScore > 0 ? 100 : 0);
  
  // Find best and worst providers
  const sorted = [...current.breakdown].sort((a, b) => b.score - a.score);
  const bestProvider = sorted[0]?.provider || null;
  const worstProvider = sorted[sorted.length - 1]?.provider || null;
  
  return {
    keyword: current.keyword,
    currentScore,
    previousScore,
    change,
    changePercent,
    bestProvider,
    worstProvider,
  };
}
