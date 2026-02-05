-- Migration: Add SEO/AEO/GEO Optimization Tables
-- Description: Creates tables for query expansion, keyword exposure, and batch scanning
-- Date: 2025-02-04

-- ============================================================
-- ENUM TYPES
-- ============================================================

-- Query expansion types
CREATE TYPE query_expansion_type AS ENUM (
  'intent_variation',
  'specificity',
  'price_focus',
  'alternative',
  'comparison',
  'review',
  'ranking',
  'feature_specific'
);

-- Expansion level
CREATE TYPE expansion_level AS ENUM ('minimal', 'standard', 'comprehensive');

-- Batch scan status
CREATE TYPE batch_scan_status AS ENUM ('queued', 'running', 'completed', 'failed', 'cancelled');

-- Report format
CREATE TYPE report_format AS ENUM ('pdf', 'html', 'markdown', 'json');

-- ============================================================
-- BATCH SCANS TABLE (must be created before query_expansions)
-- ============================================================
CREATE TABLE IF NOT EXISTS batch_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  base_query TEXT NOT NULL,
  expansion_level expansion_level DEFAULT 'standard',
  status batch_scan_status DEFAULT 'queued',
  total_queries INTEGER DEFAULT 0,
  completed_queries INTEGER DEFAULT 0,
  failed_queries INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  estimated_credits INTEGER DEFAULT 0,
  aggregated_score DECIMAL(5,2),
  aggregated_metrics JSONB DEFAULT '{}',
  providers JSONB DEFAULT '["gemini", "openai", "anthropic", "perplexity"]',
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- QUERY EXPANSIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS query_expansions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
  batch_scan_id UUID REFERENCES batch_scans(id) ON DELETE CASCADE,
  original_query TEXT NOT NULL,
  derived_query TEXT NOT NULL,
  query_type query_expansion_type NOT NULL,
  intent_description TEXT,
  relevance_score DECIMAL(3,2) DEFAULT 1.0,
  brand_mentioned BOOLEAN DEFAULT false,
  mention_position INTEGER,
  provider_results JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- KEYWORD EXPOSURE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS keyword_exposure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  scan_id UUID REFERENCES scans(id) ON DELETE SET NULL,
  batch_scan_id UUID REFERENCES batch_scans(id) ON DELETE SET NULL,
  keyword TEXT NOT NULL,
  exposure_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  mention_count INTEGER DEFAULT 0,
  avg_position DECIMAL(3,1),
  sentiment_distribution JSONB DEFAULT '{"positive": 0, "neutral": 0, "negative": 0}',
  provider_scores JSONB DEFAULT '{}',
  prominence_breakdown JSONB DEFAULT '{}',
  recorded_date DATE DEFAULT CURRENT_DATE,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(brand_id, recorded_date, keyword)
);

-- ============================================================
-- TIMELINE EVENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'content_published', 
    'campaign_started', 
    'competitor_action', 
    'algorithm_update',
    'seo_update',
    'pr_mention',
    'social_campaign'
  )),
  title TEXT NOT NULL,
  description TEXT,
  impact VARCHAR(20) CHECK (impact IN ('positive', 'negative', 'neutral')),
  visibility_before DECIMAL(5,2),
  visibility_after DECIMAL(5,2),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- COMPREHENSIVE REPORTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS comprehensive_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_period_start DATE NOT NULL,
  report_period_end DATE NOT NULL,
  report_format report_format DEFAULT 'json',
  executive_summary JSONB DEFAULT '{}',
  visibility_overview JSONB DEFAULT '{}',
  keyword_analysis JSONB DEFAULT '{}',
  competitor_analysis JSONB DEFAULT '{}',
  provider_deep_dive JSONB DEFAULT '{}',
  recommendations JSONB DEFAULT '{}',
  next_steps JSONB DEFAULT '{}',
  file_url TEXT,
  file_size INTEGER,
  is_scheduled BOOLEAN DEFAULT false,
  scheduled_cron TEXT,
  sent_to TEXT[],
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDUSTRY BENCHMARKS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS industry_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry industry_type NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(5,2) NOT NULL,
  percentile_10 DECIMAL(5,2),
  percentile_25 DECIMAL(5,2),
  percentile_50 DECIMAL(5,2),
  percentile_75 DECIMAL(5,2),
  percentile_90 DECIMAL(5,2),
  sample_size INTEGER DEFAULT 0,
  calculated_date DATE DEFAULT CURRENT_DATE,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(industry, metric_name, calculated_date)
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Query expansions
CREATE INDEX IF NOT EXISTS idx_query_expansions_scan ON query_expansions(scan_id);
CREATE INDEX IF NOT EXISTS idx_query_expansions_batch_scan ON query_expansions(batch_scan_id);
CREATE INDEX IF NOT EXISTS idx_query_expansions_type ON query_expansions(query_type);

-- Batch scans
CREATE INDEX IF NOT EXISTS idx_batch_scans_brand ON batch_scans(brand_id);
CREATE INDEX IF NOT EXISTS idx_batch_scans_user ON batch_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_batch_scans_status ON batch_scans(status);
CREATE INDEX IF NOT EXISTS idx_batch_scans_created ON batch_scans(created_at DESC);

-- Keyword exposure
CREATE INDEX IF NOT EXISTS idx_keyword_exposure_brand ON keyword_exposure(brand_id);
CREATE INDEX IF NOT EXISTS idx_keyword_exposure_date ON keyword_exposure(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_keyword_exposure_keyword ON keyword_exposure(keyword);
CREATE INDEX IF NOT EXISTS idx_keyword_exposure_score ON keyword_exposure(exposure_score DESC);

-- Timeline events
CREATE INDEX IF NOT EXISTS idx_timeline_events_brand ON timeline_events(brand_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_date ON timeline_events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_events_type ON timeline_events(event_type);

-- Comprehensive reports
CREATE INDEX IF NOT EXISTS idx_comprehensive_reports_brand ON comprehensive_reports(brand_id);
CREATE INDEX IF NOT EXISTS idx_comprehensive_reports_period ON comprehensive_reports(report_period_start, report_period_end);

-- Industry benchmarks
CREATE INDEX IF NOT EXISTS idx_industry_benchmarks_industry ON industry_benchmarks(industry);
CREATE INDEX IF NOT EXISTS idx_industry_benchmarks_metric ON industry_benchmarks(metric_name);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE query_expansions ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_exposure ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE comprehensive_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE industry_benchmarks ENABLE ROW LEVEL SECURITY;

-- Query expansions policies
CREATE POLICY "Users can view own query expansions" ON query_expansions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM scans WHERE scans.id = query_expansions.scan_id AND scans.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM batch_scans WHERE batch_scans.id = query_expansions.batch_scan_id AND batch_scans.user_id = auth.uid()
    )
  );

-- Batch scans policies
CREATE POLICY "Users can view own batch scans" ON batch_scans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create batch scans" ON batch_scans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own batch scans" ON batch_scans
  FOR UPDATE USING (auth.uid() = user_id);

-- Keyword exposure policies
CREATE POLICY "Users can view own keyword exposure" ON keyword_exposure
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM brands WHERE brands.id = keyword_exposure.brand_id AND brands.user_id = auth.uid()
    )
  );

-- Timeline events policies
CREATE POLICY "Users can view own timeline events" ON timeline_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create timeline events" ON timeline_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own timeline events" ON timeline_events
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own timeline events" ON timeline_events
  FOR DELETE USING (auth.uid() = user_id);

-- Comprehensive reports policies
CREATE POLICY "Users can view own reports" ON comprehensive_reports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create reports" ON comprehensive_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Industry benchmarks - everyone can read (aggregated data)
CREATE POLICY "Everyone can view industry benchmarks" ON industry_benchmarks
  FOR SELECT USING (true);

-- ============================================================
-- SEED DATA: Industry Benchmarks
-- ============================================================

INSERT INTO industry_benchmarks (industry, metric_name, metric_value, percentile_10, percentile_25, percentile_50, percentile_75, percentile_90, sample_size, valid_until) VALUES
-- Fintech
('fintech', 'visibility_score', 55.0, 20.0, 35.0, 55.0, 72.0, 85.0, 150, NOW() + INTERVAL '90 days'),
('fintech', 'ai_visibility_score', 48.0, 15.0, 30.0, 48.0, 65.0, 80.0, 150, NOW() + INTERVAL '90 days'),
('fintech', 'mention_rate', 0.42, 0.15, 0.28, 0.42, 0.58, 0.72, 150, NOW() + INTERVAL '90 days'),

-- E-commerce
('ecommerce', 'visibility_score', 62.0, 25.0, 42.0, 62.0, 78.0, 88.0, 200, NOW() + INTERVAL '90 days'),
('ecommerce', 'ai_visibility_score', 58.0, 22.0, 38.0, 58.0, 75.0, 85.0, 200, NOW() + INTERVAL '90 days'),
('ecommerce', 'mention_rate', 0.55, 0.20, 0.35, 0.55, 0.70, 0.82, 200, NOW() + INTERVAL '90 days'),

-- SaaS
('saas', 'visibility_score', 58.0, 22.0, 38.0, 58.0, 75.0, 87.0, 180, NOW() + INTERVAL '90 days'),
('saas', 'ai_visibility_score', 52.0, 18.0, 35.0, 52.0, 70.0, 82.0, 180, NOW() + INTERVAL '90 days'),
('saas', 'mention_rate', 0.48, 0.18, 0.32, 0.48, 0.62, 0.75, 180, NOW() + INTERVAL '90 days'),

-- Education
('education', 'visibility_score', 52.0, 18.0, 32.0, 52.0, 68.0, 82.0, 120, NOW() + INTERVAL '90 days'),
('education', 'ai_visibility_score', 45.0, 12.0, 28.0, 45.0, 62.0, 78.0, 120, NOW() + INTERVAL '90 days'),
('education', 'mention_rate', 0.38, 0.12, 0.25, 0.38, 0.52, 0.68, 120, NOW() + INTERVAL '90 days'),

-- Healthcare
('healthcare', 'visibility_score', 48.0, 15.0, 28.0, 48.0, 65.0, 78.0, 100, NOW() + INTERVAL '90 days'),
('healthcare', 'ai_visibility_score', 42.0, 10.0, 25.0, 42.0, 58.0, 72.0, 100, NOW() + INTERVAL '90 days'),
('healthcare', 'mention_rate', 0.35, 0.10, 0.22, 0.35, 0.48, 0.62, 100, NOW() + INTERVAL '90 days'),

-- F&B
('fnb', 'visibility_score', 65.0, 28.0, 45.0, 65.0, 80.0, 90.0, 220, NOW() + INTERVAL '90 days'),
('fnb', 'ai_visibility_score', 60.0, 25.0, 42.0, 60.0, 78.0, 88.0, 220, NOW() + INTERVAL '90 days'),
('fnb', 'mention_rate', 0.58, 0.22, 0.38, 0.58, 0.72, 0.85, 220, NOW() + INTERVAL '90 days'),

-- Beauty
('beauty', 'visibility_score', 68.0, 30.0, 48.0, 68.0, 82.0, 92.0, 180, NOW() + INTERVAL '90 days'),
('beauty', 'ai_visibility_score', 62.0, 28.0, 45.0, 62.0, 78.0, 88.0, 180, NOW() + INTERVAL '90 days'),
('beauty', 'mention_rate', 0.60, 0.25, 0.42, 0.60, 0.75, 0.88, 180, NOW() + INTERVAL '90 days'),

-- Travel
('travel', 'visibility_score', 60.0, 25.0, 42.0, 60.0, 76.0, 86.0, 140, NOW() + INTERVAL '90 days'),
('travel', 'ai_visibility_score', 55.0, 22.0, 38.0, 55.0, 72.0, 82.0, 140, NOW() + INTERVAL '90 days'),
('travel', 'mention_rate', 0.52, 0.20, 0.35, 0.52, 0.68, 0.80, 140, NOW() + INTERVAL '90 days'),

-- Real Estate
('realestate', 'visibility_score', 50.0, 18.0, 32.0, 50.0, 66.0, 78.0, 90, NOW() + INTERVAL '90 days'),
('realestate', 'ai_visibility_score', 45.0, 15.0, 28.0, 45.0, 60.0, 72.0, 90, NOW() + INTERVAL '90 days'),
('realestate', 'mention_rate', 0.40, 0.15, 0.28, 0.40, 0.55, 0.68, 90, NOW() + INTERVAL '90 days'),

-- Other
('other', 'visibility_score', 50.0, 18.0, 32.0, 50.0, 66.0, 80.0, 300, NOW() + INTERVAL '90 days'),
('other', 'ai_visibility_score', 45.0, 15.0, 28.0, 45.0, 62.0, 75.0, 300, NOW() + INTERVAL '90 days'),
('other', 'mention_rate', 0.42, 0.15, 0.28, 0.42, 0.58, 0.72, 300, NOW() + INTERVAL '90 days')
ON CONFLICT DO NOTHING;
