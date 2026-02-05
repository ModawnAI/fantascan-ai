/**
 * Query Expansion Types
 * Types for derived query generation and management
 */

export type QueryExpansionType =
  | 'intent_variation'
  | 'specificity'
  | 'price_focus'
  | 'alternative'
  | 'comparison'
  | 'review'
  | 'ranking'
  | 'feature_specific';

export type ExpansionLevel = 'minimal' | 'standard' | 'comprehensive';

export interface DerivedQuery {
  query: string;
  type: QueryExpansionType;
  intent: string;
  relevanceScore: number;
  expectedBrandMentionLikelihood: 'high' | 'medium' | 'low';
}

export interface QueryExpansionInput {
  originalQuery: string;
  brandName: string;
  industry: string;
  keywords: string[];
  competitors: string[];
  expansionLevel?: ExpansionLevel;
}

export interface QueryExpansionResult {
  originalQuery: string;
  derivedQueries: DerivedQuery[];
  totalQueries: number;
  estimatedCredits: number;
}

export interface TemplateExpansionConfig {
  type: QueryExpansionType;
  templates: string[];
  intent: string;
  likelihood: 'high' | 'medium' | 'low';
}

// LLM expansion response format
export interface LLMExpansionResponse {
  queries: Array<{
    query: string;
    type: string;
    intent: string;
    expectedBrandMentionLikelihood: 'high' | 'medium' | 'low';
  }>;
}

// Query expansion record for database
export interface QueryExpansionRecord {
  id?: string;
  scan_id?: string;
  batch_scan_id?: string;
  original_query: string;
  derived_query: string;
  query_type: QueryExpansionType;
  intent_description?: string;
  relevance_score: number;
  brand_mentioned?: boolean;
  mention_position?: number;
  provider_results?: Record<string, unknown>;
  created_at?: string;
}
