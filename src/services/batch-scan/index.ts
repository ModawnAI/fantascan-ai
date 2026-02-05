/**
 * Batch Scan Service
 * Handles multi-query batch scanning with aggregated metrics
 */

import type { ProviderType } from '@/types/database';
import { CREDIT_COSTS } from '@/types/database';
import type {
  BatchScanConfig,
  BatchScanProgress,
  AggregatedMetrics,
  QueryResult,
  ProviderResult,
  BatchScanResult,
} from './types';
import type { DerivedQuery } from '../query-expansion/types';

// Re-export types
export type {
  BatchScanConfig,
  BatchScanProgress,
  AggregatedMetrics,
  QueryResult,
  ProviderResult,
  BatchScanResult,
};

/**
 * Calculate estimated credits for a batch scan
 */
export function estimateBatchCredits(
  queryCount: number,
  providers: ProviderType[]
): number {
  const creditsPerQuery = providers.reduce(
    (sum, p) => sum + (CREDIT_COSTS[p] || 2),
    0
  );
  return queryCount * creditsPerQuery;
}

/**
 * Calculate aggregated metrics from query results
 */
export function calculateAggregatedMetrics(
  queryResults: QueryResult[],
  providers: ProviderType[]
): AggregatedMetrics {
  // Initialize counters
  let totalMentions = 0;
  let totalResponses = 0;
  const mentionPositions: number[] = [];
  const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
  const providerMentions: Record<string, number> = {};
  const providerTotals: Record<string, number> = {};
  const queryTypeStats: Record<string, { mentions: number; positions: number[]; total: number; bestProvider: ProviderType | null; bestScore: number }> = {};
  
  // Initialize provider stats
  for (const provider of providers) {
    providerMentions[provider] = 0;
    providerTotals[provider] = 0;
  }
  
  // Process query results
  for (const result of queryResults) {
    // Initialize query type stats
    if (!queryTypeStats[result.queryType]) {
      queryTypeStats[result.queryType] = {
        mentions: 0,
        positions: [],
        total: 0,
        bestProvider: null,
        bestScore: 0,
      };
    }
    
    for (const pr of result.providerResults) {
      if (pr.status === 'success') {
        totalResponses++;
        providerTotals[pr.provider] = (providerTotals[pr.provider] || 0) + 1;
        queryTypeStats[result.queryType].total++;
        
        if (pr.brandMentioned) {
          totalMentions++;
          providerMentions[pr.provider] = (providerMentions[pr.provider] || 0) + 1;
          queryTypeStats[result.queryType].mentions++;
          
          if (pr.mentionPosition) {
            mentionPositions.push(pr.mentionPosition);
            queryTypeStats[result.queryType].positions.push(pr.mentionPosition);
          }
          
          // Track best provider for this query type
          const providerScore = providerMentions[pr.provider] / (providerTotals[pr.provider] || 1);
          if (providerScore > queryTypeStats[result.queryType].bestScore) {
            queryTypeStats[result.queryType].bestScore = providerScore;
            queryTypeStats[result.queryType].bestProvider = pr.provider;
          }
        }
        
        if (pr.sentiment) {
          sentimentCounts[pr.sentiment]++;
        }
      }
    }
  }
  
  // Calculate provider scores (0-100 based on mention rate)
  const providerScores: Record<string, number> = {};
  for (const provider of providers) {
    const total = providerTotals[provider] || 0;
    const mentions = providerMentions[provider] || 0;
    providerScores[provider] = total > 0 ? Math.round((mentions / total) * 100) : 0;
  }
  
  // Calculate query type performance
  const queryTypePerformance: Record<string, { mentionRate: number; avgPosition: number | null; bestProvider: ProviderType | null }> = {};
  for (const [type, stats] of Object.entries(queryTypeStats)) {
    queryTypePerformance[type] = {
      mentionRate: stats.total > 0 ? stats.mentions / stats.total : 0,
      avgPosition: stats.positions.length > 0
        ? stats.positions.reduce((a, b) => a + b, 0) / stats.positions.length
        : null,
      bestProvider: stats.bestProvider,
    };
  }
  
  // Calculate overall scores
  const mentionRate = totalResponses > 0 ? totalMentions / totalResponses : 0;
  const overallVisibilityScore = Math.round(mentionRate * 100);
  
  // AI vs SEO scores
  const aiProviders = ['gemini', 'openai', 'anthropic', 'grok'];
  const searchProviders = ['perplexity', 'google_search'];
  
  let aiMentions = 0, aiTotal = 0;
  let seoMentions = 0, seoTotal = 0;
  
  for (const provider of providers) {
    if (aiProviders.includes(provider)) {
      aiMentions += providerMentions[provider] || 0;
      aiTotal += providerTotals[provider] || 0;
    } else if (searchProviders.includes(provider)) {
      seoMentions += providerMentions[provider] || 0;
      seoTotal += providerTotals[provider] || 0;
    }
  }
  
  const aiVisibilityScore = aiTotal > 0 ? Math.round((aiMentions / aiTotal) * 100) : 0;
  const seoVisibilityScore = seoTotal > 0 ? Math.round((seoMentions / seoTotal) * 100) : 0;
  
  // Best and worst queries
  const queryScores = queryResults.map(qr => {
    const mentions = qr.providerResults.filter(pr => pr.brandMentioned).length;
    const total = qr.providerResults.filter(pr => pr.status === 'success').length;
    return {
      query: qr.query,
      score: total > 0 ? Math.round((mentions / total) * 100) : 0,
      mentionCount: mentions,
    };
  });
  
  queryScores.sort((a, b) => b.score - a.score);
  const bestQueries = queryScores.slice(0, 3);
  const worstQueries = queryScores.slice(-3).reverse();
  
  return {
    overallVisibilityScore,
    aiVisibilityScore,
    seoVisibilityScore,
    totalMentions,
    mentionRate,
    avgMentionPosition: mentionPositions.length > 0
      ? mentionPositions.reduce((a, b) => a + b, 0) / mentionPositions.length
      : null,
    providerScores: providerScores as Record<ProviderType, number>,
    providerMentionCounts: providerMentions as Record<ProviderType, number>,
    sentimentDistribution: sentimentCounts,
    queryTypePerformance,
    bestQueries,
    worstQueries,
  };
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(
  completed: number,
  failed: number,
  total: number
): number {
  if (total === 0) return 0;
  return Math.round(((completed + failed) / total) * 100);
}

/**
 * Estimate remaining time based on current progress
 */
export function estimateRemainingTime(
  startTime: Date,
  completed: number,
  total: number
): number | null {
  if (completed === 0 || total === 0) return null;
  
  const elapsed = Date.now() - startTime.getTime();
  const avgTimePerQuery = elapsed / completed;
  const remaining = total - completed;
  
  return Math.round(avgTimePerQuery * remaining);
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return '1초 미만';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}시간 ${minutes % 60}분`;
  }
  if (minutes > 0) {
    return `${minutes}분 ${seconds % 60}초`;
  }
  return `${seconds}초`;
}

/**
 * Get batch scan status display info
 */
export function getBatchStatusInfo(status: string): {
  label: string;
  color: string;
  description: string;
} {
  const statusMap: Record<string, { label: string; color: string; description: string }> = {
    queued: {
      label: '대기 중',
      color: 'text-yellow-400',
      description: '스캔이 대기열에 있습니다',
    },
    running: {
      label: '진행 중',
      color: 'text-blue-400',
      description: '스캔이 실행 중입니다',
    },
    completed: {
      label: '완료',
      color: 'text-green-400',
      description: '스캔이 성공적으로 완료되었습니다',
    },
    failed: {
      label: '실패',
      color: 'text-red-400',
      description: '스캔 중 오류가 발생했습니다',
    },
    cancelled: {
      label: '취소됨',
      color: 'text-gray-400',
      description: '스캔이 취소되었습니다',
    },
  };
  
  return statusMap[status] || statusMap.queued;
}

/**
 * Group queries by performance tier
 */
export function groupQueriesByPerformance(
  queryResults: QueryResult[]
): {
  excellent: QueryResult[]; // 80%+ mention rate
  good: QueryResult[];      // 50-79% mention rate
  poor: QueryResult[];      // <50% mention rate
} {
  return {
    excellent: queryResults.filter(qr => {
      const mentions = qr.providerResults.filter(pr => pr.brandMentioned).length;
      const total = qr.providerResults.filter(pr => pr.status === 'success').length;
      return total > 0 && (mentions / total) >= 0.8;
    }),
    good: queryResults.filter(qr => {
      const mentions = qr.providerResults.filter(pr => pr.brandMentioned).length;
      const total = qr.providerResults.filter(pr => pr.status === 'success').length;
      const rate = total > 0 ? mentions / total : 0;
      return rate >= 0.5 && rate < 0.8;
    }),
    poor: queryResults.filter(qr => {
      const mentions = qr.providerResults.filter(pr => pr.brandMentioned).length;
      const total = qr.providerResults.filter(pr => pr.status === 'success').length;
      return total > 0 && (mentions / total) < 0.5;
    }),
  };
}
