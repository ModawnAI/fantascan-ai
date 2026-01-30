/**
 * Share of Voice (SOV) Calculation Service
 * Calculates competitive share of voice across AI providers
 */

import type { BrandDetectionResult } from '@/services/brand-detection';
import type { ShareOfVoice, CompetitorAnalysis, ProviderType } from '@/types/database';

interface SOVCalculationInput {
  brandName: string;
  competitors: string[];
  results: BrandDetectionResult[];
}

interface SOVResult {
  brandSOV: ShareOfVoice;
  competitorSOV: ShareOfVoice[];
  totalMentions: number;
  competitorAnalysis: Omit<CompetitorAnalysis, 'id' | 'scan_id' | 'brand_id' | 'created_at'>[];
}

/**
 * Calculate Share of Voice for brand and competitors
 */
export function calculateShareOfVoice(input: SOVCalculationInput): SOVResult {
  const { brandName, competitors, results } = input;
  
  // Count mentions for brand
  const brandMentions = results.filter(r => r.brandMentioned && !r.error).length;
  const _totalProviders = results.filter(r => !r.error).length;
  
  // Count mentions for each competitor
  const competitorMentionCounts: Record<string, number> = {};
  competitors.forEach(competitor => {
    competitorMentionCounts[competitor] = 0;
  });
  
  results.forEach(result => {
    if (result.error) return;
    result.competitorsMentioned.forEach(competitor => {
      if (competitorMentionCounts[competitor] !== undefined) {
        competitorMentionCounts[competitor]++;
      }
    });
  });
  
  // Calculate total mentions across all entities
  const totalMentions = brandMentions + 
    Object.values(competitorMentionCounts).reduce((sum, c) => sum + c, 0);
  
  // Calculate SOV percentages
  const brandPercentage = totalMentions > 0 
    ? Math.round((brandMentions / totalMentions) * 100 * 10) / 10
    : 0;
  
  const brandSOV: ShareOfVoice = {
    brandName,
    percentage: brandPercentage,
    mentionsCount: brandMentions,
    trend: 'stable', // Will be updated with historical data
  };
  
  const competitorSOV: ShareOfVoice[] = competitors.map(competitor => ({
    brandName: competitor,
    percentage: totalMentions > 0 
      ? Math.round((competitorMentionCounts[competitor] / totalMentions) * 100 * 10) / 10
      : 0,
    mentionsCount: competitorMentionCounts[competitor],
    trend: 'stable',
  }));
  
  // Build detailed competitor analysis
  const competitorAnalysis = buildCompetitorAnalysis(competitors, results);
  
  return {
    brandSOV,
    competitorSOV,
    totalMentions,
    competitorAnalysis,
  };
}

/**
 * Build detailed competitor analysis
 */
function buildCompetitorAnalysis(
  competitors: string[],
  results: BrandDetectionResult[]
): Omit<CompetitorAnalysis, 'id' | 'scan_id' | 'brand_id' | 'created_at'>[] {
  return competitors.map(competitor => {
    const mentionedResults = results.filter(
      r => !r.error && r.competitorsMentioned.includes(competitor)
    );
    
    const mentionsCount = mentionedResults.length;
    const totalProviders = results.filter(r => !r.error).length;
    
    // Provider mentions breakdown
    const providerMentions: Record<ProviderType, boolean> = {
      gemini: false,
      openai: false,
      anthropic: false,
      grok: false,
      perplexity: false,
      google_search: false,
    };
    
    mentionedResults.forEach(r => {
      providerMentions[r.provider] = true;
    });
    
    // Calculate average position
    const positions = mentionedResults
      .filter(r => r.mentionPosition !== null)
      .map(r => r.mentionPosition!);
    const averagePosition = positions.length > 0
      ? positions.reduce((sum, p) => sum + p, 0) / positions.length
      : null;
    
    // Count sentiments (when competitor is mentioned)
    const sentimentPositive = 0;
    let sentimentNeutral = 0;
    const sentimentNegative = 0;
    
    // Note: We'd need to analyze sentiment specifically for competitor mentions
    // For now, we'll use neutral as default
    mentionedResults.forEach(() => {
      sentimentNeutral++;
    });
    
    // Calculate SOV
    const totalMentions = results.reduce((sum, r) => {
      if (r.error) return sum;
      return sum + (r.brandMentioned ? 1 : 0) + r.competitorsMentioned.length;
    }, 0);
    
    const shareOfVoice = totalMentions > 0
      ? Math.round((mentionsCount / totalMentions) * 100 * 100) / 100
      : 0;
    
    return {
      competitor_name: competitor,
      visibility_score: Math.round((mentionsCount / totalProviders) * 100),
      mentions_count: mentionsCount,
      average_position: averagePosition,
      provider_mentions: providerMentions,
      sentiment_positive: sentimentPositive,
      sentiment_neutral: sentimentNeutral,
      sentiment_negative: sentimentNegative,
      share_of_voice: shareOfVoice,
    };
  });
}

/**
 * Compare brand SOV with previous period
 */
export function compareSOV(
  currentSOV: ShareOfVoice,
  previousSOV: ShareOfVoice | null
): ShareOfVoice {
  if (!previousSOV) {
    return { ...currentSOV, trend: 'stable' };
  }
  
  const change = currentSOV.percentage - previousSOV.percentage;
  let trend: 'up' | 'down' | 'stable' = 'stable';
  
  if (change > 2) trend = 'up';
  else if (change < -2) trend = 'down';
  
  return { ...currentSOV, trend };
}

/**
 * Generate SOV insights
 */
export function generateSOVInsights(
  brandSOV: ShareOfVoice,
  competitorSOV: ShareOfVoice[]
): string[] {
  const insights: string[] = [];
  
  // Sort competitors by SOV
  const sortedCompetitors = [...competitorSOV].sort(
    (a, b) => b.percentage - a.percentage
  );
  
  // Brand position insight
  const allEntities = [brandSOV, ...competitorSOV].sort(
    (a, b) => b.percentage - a.percentage
  );
  const brandPosition = allEntities.findIndex(e => e.brandName === brandSOV.brandName) + 1;
  
  if (brandPosition === 1) {
    insights.push(`귀사의 브랜드가 AI 검색 점유율 1위입니다 (${brandSOV.percentage}%)`);
  } else {
    const leader = allEntities[0];
    insights.push(
      `현재 AI 검색 점유율 ${brandPosition}위입니다. ` +
      `1위 ${leader.brandName}(${leader.percentage}%)와 ` +
      `${Math.abs(leader.percentage - brandSOV.percentage).toFixed(1)}%p 차이가 있습니다.`
    );
  }
  
  // Competitor threat insight
  const closestCompetitor = sortedCompetitors.find(
    c => Math.abs(c.percentage - brandSOV.percentage) < 5 && c.percentage > 0
  );
  if (closestCompetitor) {
    insights.push(
      `${closestCompetitor.brandName}가 근소한 차이(${Math.abs(closestCompetitor.percentage - brandSOV.percentage).toFixed(1)}%p)로 ` +
      `경쟁 중입니다. 주의가 필요합니다.`
    );
  }
  
  // Low visibility insight
  if (brandSOV.percentage < 20 && sortedCompetitors.length > 0) {
    insights.push(
      `전체 AI 검색 점유율이 낮습니다. 콘텐츠 최적화를 통해 가시성을 높일 필요가 있습니다.`
    );
  }
  
  return insights;
}
