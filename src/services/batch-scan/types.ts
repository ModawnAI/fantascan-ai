/**
 * Batch Scan Types
 * Types for multi-query batch scanning
 */

import type { ProviderType, ScanResult } from '@/types/database';
import type { DerivedQuery, ExpansionLevel } from '../query-expansion/types';

export type BatchScanStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface BatchScanConfig {
  brandId: string;
  userId: string;
  baseQuery: string;
  expansionLevel: ExpansionLevel;
  providers: ProviderType[];
  includeOriginalQuery: boolean;
  maxConcurrency?: number;
}

export interface BatchScanProgress {
  batchScanId: string;
  status: BatchScanStatus;
  totalQueries: number;
  completedQueries: number;
  failedQueries: number;
  progressPercent: number;
  currentQuery?: string;
  startedAt?: string;
  estimatedCompletionTime?: string;
}

export interface QueryResult {
  queryId: string;
  query: string;
  queryType: string;
  providerResults: ProviderResult[];
  brandMentioned: boolean;
  avgMentionPosition: number | null;
  overallSentiment: 'positive' | 'neutral' | 'negative' | null;
  executionTimeMs: number;
}

export interface ProviderResult {
  provider: ProviderType;
  status: 'success' | 'error';
  content?: string;
  brandMentioned: boolean;
  mentionPosition?: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
  error?: string;
  responseTimeMs: number;
}

export interface AggregatedMetrics {
  // Overall scores
  overallVisibilityScore: number;
  aiVisibilityScore: number;
  seoVisibilityScore: number;
  
  // Brand mention stats
  totalMentions: number;
  mentionRate: number; // mentions / total responses
  avgMentionPosition: number | null;
  
  // Provider breakdown
  providerScores: Record<ProviderType, number>;
  providerMentionCounts: Record<ProviderType, number>;
  
  // Sentiment breakdown
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  
  // Query type performance
  queryTypePerformance: Record<string, {
    mentionRate: number;
    avgPosition: number | null;
    bestProvider: ProviderType | null;
  }>;
  
  // Best performing
  bestQueries: Array<{
    query: string;
    score: number;
    mentionCount: number;
  }>;
  
  worstQueries: Array<{
    query: string;
    score: number;
    mentionCount: number;
  }>;
}

export interface BatchScanResult {
  batchScanId: string;
  brandId: string;
  baseQuery: string;
  status: BatchScanStatus;
  totalQueries: number;
  completedQueries: number;
  failedQueries: number;
  creditsUsed: number;
  aggregatedMetrics: AggregatedMetrics;
  queryResults: QueryResult[];
  derivedQueries: DerivedQuery[];
  executionTimeMs: number;
  startedAt: string;
  completedAt: string;
}

export interface ScenarioTestConfig {
  name: string;
  description: string;
  queries: string[];
  targetPersona: PersonaType;
  expectedOutcome: string;
}

export type PersonaType =
  | 'first_time_buyer'
  | 'comparing_options'
  | 'price_sensitive'
  | 'feature_focused'
  | 'brand_aware'
  | 'problem_solving';

export interface ScenarioMatrix {
  scenarios: ScenarioTestConfig[];
  results: Map<string, Map<ProviderType, QueryResult>>;
}

// Database record types
export interface BatchScanRecord {
  id: string;
  brand_id: string;
  user_id: string;
  base_query: string;
  expansion_level: ExpansionLevel;
  status: BatchScanStatus;
  total_queries: number;
  completed_queries: number;
  failed_queries: number;
  credits_used: number;
  estimated_credits: number;
  aggregated_score: number | null;
  aggregated_metrics: AggregatedMetrics | null;
  providers: ProviderType[];
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}
