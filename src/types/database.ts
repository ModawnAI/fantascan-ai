// Database types for Fantascan AI

export type SubscriptionTier = 'free' | 'starter' | 'pro';

export type ScanStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Database provider enum values (what's stored in DB)
export type ProviderType = 'gemini' | 'openai' | 'anthropic' | 'grok' | 'perplexity' | 'google_search';

// Display names for providers
export type ProviderDisplayType = 'gemini' | 'openai' | 'claude' | 'grok' | 'perplexity' | 'google';

export type IndustryType =
  | 'fintech'
  | 'ecommerce'
  | 'saas'
  | 'education'
  | 'healthcare'
  | 'fnb'
  | 'beauty'
  | 'travel'
  | 'realestate'
  | 'construction'
  | 'other';

export type QueryType = 'recommendation' | 'comparison' | 'review' | 'ranking';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  plan: SubscriptionTier;
  credits: number;
  created_at: string;
  updated_at: string;
}

export interface Brand {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  industry: IndustryType;
  keywords: string[];
  competitors: string[];
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export type ScanType = 'full' | 'single' | 'initial';

export interface Scan {
  id: string;
  brand_id: string;
  user_id: string;
  scan_type: ScanType;
  status: ScanStatus;
  visibility_score: number | null;
  ai_visibility_score: number | null;
  seo_visibility_score: number | null;
  mentions_count: number;
  total_providers: number;
  credits_used: number;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface ScanQuery {
  id: string;
  scan_id: string;
  query_text: string;
  query_type: QueryType;
  created_at: string;
}

export interface ScanResult {
  id: string;
  scan_id: string;
  query_id: string | null;
  provider: ProviderType;
  provider_category: 'ai' | 'search';
  status: 'success' | 'error';
  content: string | null;
  brand_mentioned: boolean;
  mention_position: number | null;
  mention_context: string | null;
  sentiment_score: 'positive' | 'neutral' | 'negative' | null;
  competitor_mentions: Record<string, number>;
  response_time_ms: number;
  error_message: string | null;
  created_at: string;
}

export type InsightType = 'improvement' | 'strength' | 'opportunity' | 'threat';
export type InsightPriority = 'high' | 'medium' | 'low';

export interface Insight {
  id: string;
  scan_id: string;
  brand_id: string;
  insight_type: InsightType;
  priority: InsightPriority;
  title: string;
  description: string;
  action_items: string[];
  created_at: string;
}

export interface QueryTemplate {
  id: string;
  industry: IndustryType;
  query_type: QueryType;
  template_ko: string;
  template_en: string;
  is_active: boolean;
  created_at: string;
}

// Credit costs per provider (using database enum values)
export const CREDIT_COSTS: Record<ProviderType, number> = {
  gemini: 1,
  openai: 2,
  anthropic: 2,
  grok: 2,
  perplexity: 2,
  google_search: 1,
};

// Mapping from database provider type to LLM client provider
export type LLMProviderType = 'openai' | 'gemini' | 'claude' | 'grok' | 'perplexity';

// Map database provider type to internal LLM provider name
export function toInternalProvider(dbProvider: ProviderType): LLMProviderType | null {
  const map: Record<ProviderType, LLMProviderType | null> = {
    anthropic: 'claude',
    google_search: null, // Not an LLM provider
    gemini: 'gemini',
    openai: 'openai',
    grok: 'grok',
    perplexity: 'perplexity',
  };
  return map[dbProvider];
}

// Map internal LLM provider to database provider type
export function toDbProvider(llmProvider: LLMProviderType): ProviderType {
  const map: Record<LLMProviderType, ProviderType> = {
    claude: 'anthropic',
    gemini: 'gemini',
    openai: 'openai',
    grok: 'grok',
    perplexity: 'perplexity',
  };
  return map[llmProvider];
}

// Provider display info (for UI components)
export const PROVIDER_DISPLAY: Record<ProviderType, { name: string; color: string; icon: string }> = {
  gemini: { name: 'Gemini', color: '#4285F4', icon: '✦' },
  openai: { name: 'ChatGPT', color: '#10A37F', icon: '◯' },
  anthropic: { name: 'Claude', color: '#D97706', icon: '◈' },
  grok: { name: 'Grok', color: '#1DA1F2', icon: '✕' },
  perplexity: { name: 'Perplexity', color: '#6366F1', icon: '◎' },
  google_search: { name: 'Google', color: '#EA4335', icon: 'G' },
};

// Subscription tier limits
export const TIER_LIMITS: Record<SubscriptionTier, { credits: number; price: number }> = {
  free: { credits: 100, price: 0 },
  starter: { credits: 500, price: 29000 },
  pro: { credits: 2000, price: 99000 },
};

// ============================================
// Analytics Types (New)
// ============================================

// Historical visibility tracking
export interface VisibilityHistory {
  id: string;
  brand_id: string;
  scan_id: string | null;
  recorded_at: string;
  visibility_score: number;
  ai_visibility_score: number;
  seo_visibility_score: number;
  provider_scores: Record<ProviderType, number>;
  competitor_sov: Record<string, number>;
  mentions_count: number;
  total_providers: number;
  created_at: string;
}

// Citation tracking
export interface Citation {
  id: string;
  scan_result_id: string;
  scan_id: string;
  brand_id: string;
  source_url: string;
  source_domain: string | null;
  source_title: string | null;
  citation_context: string | null;
  position_in_response: number | null;
  provider: string;
  created_at: string;
}

// Alert types
export type AlertType = 
  | 'visibility_drop'
  | 'visibility_spike'
  | 'competitor_spike'
  | 'new_mention'
  | 'sentiment_shift'
  | 'first_citation'
  | 'hallucination_detected';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export type AlertChannel = 'email' | 'slack' | 'in_app';

export interface AlertConfig {
  id: string;
  user_id: string;
  brand_id: string;
  alert_type: AlertType;
  threshold: {
    percentage?: number;
    direction?: 'up' | 'down';
    value?: number;
  };
  channels: AlertChannel[];
  webhook_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: string;
  config_id: string | null;
  user_id: string;
  brand_id: string;
  alert_type: AlertType;
  title: string;
  message: string;
  severity: AlertSeverity;
  data: Record<string, unknown>;
  sent_via: AlertChannel[];
  is_read: boolean;
  acknowledged_at: string | null;
  triggered_at: string;
}

// Content recommendations
export type RecommendationType = 'schema' | 'content' | 'keyword' | 'entity' | 'structure' | 'citation';
export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low';
export type RecommendationStatus = 'pending' | 'in_progress' | 'completed' | 'dismissed';

export interface ContentRecommendation {
  id: string;
  scan_id: string | null;
  brand_id: string;
  recommendation_type: RecommendationType;
  priority: RecommendationPriority;
  title: string;
  description: string;
  action_items: string[];
  estimated_impact: 'high' | 'medium' | 'low' | null;
  estimated_effort: 'quick' | 'moderate' | 'significant' | null;
  target_provider: string | null;
  status: RecommendationStatus;
  completed_at: string | null;
  created_at: string;
}

// Topic gap analysis
export interface TopicGap {
  id: string;
  brand_id: string;
  scan_id: string | null;
  topic: string;
  topic_category: string | null;
  brand_coverage_score: number;
  competitor_coverage_score: number;
  gap_score: number;
  covered_by_competitors: string[];
  suggested_content_types: string[];
  priority: RecommendationPriority;
  created_at: string;
}

// Query fanouts tracking
export interface QueryFanout {
  id: string;
  scan_id: string;
  brand_id: string;
  original_query: string;
  sub_queries: Array<{ query: string; provider: string; relevance: number }>;
  query_transformations: number;
  semantic_variations: string[];
  provider: string;
  created_at: string;
}

// Competitor analysis
export interface CompetitorAnalysis {
  id: string;
  scan_id: string;
  brand_id: string;
  competitor_name: string;
  visibility_score: number;
  mentions_count: number;
  average_position: number | null;
  provider_mentions: Record<ProviderType, boolean>;
  sentiment_positive: number;
  sentiment_neutral: number;
  sentiment_negative: number;
  share_of_voice: number;
  created_at: string;
}

// Extended scan result with new fields
export interface ScanResultExtended extends ScanResult {
  accuracy_score: number | null;
  has_hallucination: boolean;
  hallucination_details: string | null;
  cited_sources: string[];
  mention_paragraph: number | null;
  is_above_fold: boolean | null;
  mention_prominence: 'featured' | 'primary' | 'secondary' | 'mentioned' | null;
}

// Trend calculation types
export type TrendPeriod = '7d' | '30d' | '90d';

export interface TrendData {
  period: TrendPeriod;
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  direction: 'up' | 'down' | 'stable';
  dataPoints: Array<{
    date: string;
    score: number;
  }>;
}

export interface ShareOfVoice {
  brandName: string;
  percentage: number;
  mentionsCount: number;
  trend: 'up' | 'down' | 'stable';
}

// Dashboard summary types
export interface DashboardSummary {
  visibilityScore: number;
  aiScore: number;
  seoScore: number;
  trend: TrendData;
  shareOfVoice: ShareOfVoice[];
  topCitations: Citation[];
  recentAlerts: Alert[];
  recommendations: ContentRecommendation[];
}
