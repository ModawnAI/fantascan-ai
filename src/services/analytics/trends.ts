/**
 * Trend Calculation Service
 * Calculates historical visibility trends for brands
 */

import type { TrendData, TrendPeriod, VisibilityHistory } from '@/types/database';

interface TrendCalculationInput {
  history: VisibilityHistory[];
  period: TrendPeriod;
}

/**
 * Calculate trend data from visibility history
 */
export function calculateTrend(input: TrendCalculationInput): TrendData {
  const { history, period } = input;
  
  const periodDays = getPeriodDays(period);
  const now = new Date();
  
  // Sort by date descending
  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
  );
  
  // Get current period data
  const currentPeriodStart = new Date(now);
  currentPeriodStart.setDate(currentPeriodStart.getDate() - periodDays);
  
  const previousPeriodStart = new Date(currentPeriodStart);
  previousPeriodStart.setDate(previousPeriodStart.getDate() - periodDays);
  
  const currentPeriodData = sortedHistory.filter(h => {
    const date = new Date(h.recorded_at);
    return date >= currentPeriodStart && date <= now;
  });
  
  const previousPeriodData = sortedHistory.filter(h => {
    const date = new Date(h.recorded_at);
    return date >= previousPeriodStart && date < currentPeriodStart;
  });
  
  // Calculate averages
  const currentAvg = calculateAverage(currentPeriodData.map(h => h.visibility_score));
  const previousAvg = calculateAverage(previousPeriodData.map(h => h.visibility_score));
  
  // Calculate change
  const change = currentAvg - previousAvg;
  const changePercent = previousAvg > 0 ? (change / previousAvg) * 100 : 0;
  
  // Determine direction
  let direction: 'up' | 'down' | 'stable' = 'stable';
  if (changePercent > 2) direction = 'up';
  else if (changePercent < -2) direction = 'down';
  
  // Build data points for chart
  const dataPoints = buildDataPoints(sortedHistory, periodDays);
  
  return {
    period,
    current: Math.round(currentAvg),
    previous: Math.round(previousAvg),
    change: Math.round(change),
    changePercent: Math.round(changePercent * 10) / 10,
    direction,
    dataPoints,
  };
}

/**
 * Calculate trend for each provider
 */
export function calculateProviderTrends(
  history: VisibilityHistory[],
  period: TrendPeriod
): Record<string, TrendData> {
  const periodDays = getPeriodDays(period);
  const now = new Date();
  const currentPeriodStart = new Date(now);
  currentPeriodStart.setDate(currentPeriodStart.getDate() - periodDays);
  
  const previousPeriodStart = new Date(currentPeriodStart);
  previousPeriodStart.setDate(previousPeriodStart.getDate() - periodDays);
  
  // Collect all providers
  const providers = new Set<string>();
  history.forEach(h => {
    Object.keys(h.provider_scores || {}).forEach(p => providers.add(p));
  });
  
  const trends: Record<string, TrendData> = {};
  
  providers.forEach(provider => {
    const currentPeriodScores: number[] = [];
    const previousPeriodScores: number[] = [];
    
    history.forEach(h => {
      const date = new Date(h.recorded_at);
      const score = h.provider_scores?.[provider as keyof typeof h.provider_scores] || 0;
      
      if (date >= currentPeriodStart && date <= now) {
        currentPeriodScores.push(score);
      } else if (date >= previousPeriodStart && date < currentPeriodStart) {
        previousPeriodScores.push(score);
      }
    });
    
    const currentAvg = calculateAverage(currentPeriodScores);
    const previousAvg = calculateAverage(previousPeriodScores);
    const change = currentAvg - previousAvg;
    const changePercent = previousAvg > 0 ? (change / previousAvg) * 100 : 0;
    
    let direction: 'up' | 'down' | 'stable' = 'stable';
    if (changePercent > 2) direction = 'up';
    else if (changePercent < -2) direction = 'down';
    
    trends[provider] = {
      period,
      current: Math.round(currentAvg),
      previous: Math.round(previousAvg),
      change: Math.round(change),
      changePercent: Math.round(changePercent * 10) / 10,
      direction,
      dataPoints: buildProviderDataPoints(history, provider, periodDays),
    };
  });
  
  return trends;
}

/**
 * Calculate competitor Share of Voice trends
 */
export function calculateSOVTrend(
  history: VisibilityHistory[],
  period: TrendPeriod
): Record<string, { current: number; previous: number; change: number }> {
  const periodDays = getPeriodDays(period);
  const now = new Date();
  const currentPeriodStart = new Date(now);
  currentPeriodStart.setDate(currentPeriodStart.getDate() - periodDays);
  
  const previousPeriodStart = new Date(currentPeriodStart);
  previousPeriodStart.setDate(previousPeriodStart.getDate() - periodDays);
  
  // Collect all competitors
  const competitors = new Set<string>();
  history.forEach(h => {
    Object.keys(h.competitor_sov || {}).forEach(c => competitors.add(c));
  });
  
  const sovTrends: Record<string, { current: number; previous: number; change: number }> = {};
  
  competitors.forEach(competitor => {
    const currentPeriodSOV: number[] = [];
    const previousPeriodSOV: number[] = [];
    
    history.forEach(h => {
      const date = new Date(h.recorded_at);
      const sov = h.competitor_sov?.[competitor] || 0;
      
      if (date >= currentPeriodStart && date <= now) {
        currentPeriodSOV.push(sov);
      } else if (date >= previousPeriodStart && date < currentPeriodStart) {
        previousPeriodSOV.push(sov);
      }
    });
    
    const currentAvg = calculateAverage(currentPeriodSOV);
    const previousAvg = calculateAverage(previousPeriodSOV);
    
    sovTrends[competitor] = {
      current: Math.round(currentAvg * 10) / 10,
      previous: Math.round(previousAvg * 10) / 10,
      change: Math.round((currentAvg - previousAvg) * 10) / 10,
    };
  });
  
  return sovTrends;
}

// Helper functions
function getPeriodDays(period: TrendPeriod): number {
  switch (period) {
    case '7d': return 7;
    case '30d': return 30;
    case '90d': return 90;
    default: return 7;
  }
}

function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function buildDataPoints(
  history: VisibilityHistory[],
  periodDays: number
): Array<{ date: string; score: number }> {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - periodDays);
  
  // Create a map of date to score
  const scoreMap = new Map<string, number>();
  history.forEach(h => {
    const dateStr = new Date(h.recorded_at).toISOString().split('T')[0];
    scoreMap.set(dateStr, h.visibility_score);
  });
  
  // Build data points for each day
  const dataPoints: Array<{ date: string; score: number }> = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= now) {
    const dateStr = currentDate.toISOString().split('T')[0];
    dataPoints.push({
      date: dateStr,
      score: scoreMap.get(dateStr) || 0,
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dataPoints;
}

function buildProviderDataPoints(
  history: VisibilityHistory[],
  provider: string,
  periodDays: number
): Array<{ date: string; score: number }> {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - periodDays);
  
  const scoreMap = new Map<string, number>();
  history.forEach(h => {
    const dateStr = new Date(h.recorded_at).toISOString().split('T')[0];
    const score = h.provider_scores?.[provider as keyof typeof h.provider_scores] || 0;
    scoreMap.set(dateStr, score);
  });
  
  const dataPoints: Array<{ date: string; score: number }> = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= now) {
    const dateStr = currentDate.toISOString().split('T')[0];
    dataPoints.push({
      date: dateStr,
      score: scoreMap.get(dateStr) || 0,
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dataPoints;
}
