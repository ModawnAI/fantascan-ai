-- Migration: Add analytics tables for historical trends, citations, alerts, and recommendations
-- Date: 2025-01-30

-- ============================================
-- 1. Historical Visibility Tracking
-- ============================================
CREATE TABLE IF NOT EXISTS visibility_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  scan_id UUID REFERENCES scans(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Scores
  visibility_score INTEGER NOT NULL DEFAULT 0,
  ai_visibility_score INTEGER NOT NULL DEFAULT 0,
  seo_visibility_score INTEGER NOT NULL DEFAULT 0,
  
  -- Provider breakdown
  provider_scores JSONB NOT NULL DEFAULT '{}',
  
  -- Competitor Share of Voice
  competitor_sov JSONB NOT NULL DEFAULT '{}',
  
  -- Metadata
  mentions_count INTEGER NOT NULL DEFAULT 0,
  total_providers INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- One record per brand per day
  UNIQUE(brand_id, recorded_date)
);

-- Indexes for visibility_history
CREATE INDEX IF NOT EXISTS idx_visibility_history_brand_id ON visibility_history(brand_id);
CREATE INDEX IF NOT EXISTS idx_visibility_history_recorded_at ON visibility_history(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_visibility_history_brand_date ON visibility_history(brand_id, recorded_at DESC);

-- ============================================
-- 2. Citation Tracking
-- ============================================
CREATE TABLE IF NOT EXISTS citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_result_id UUID NOT NULL REFERENCES scan_results(id) ON DELETE CASCADE,
  scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  
  -- Citation details
  source_url TEXT NOT NULL,
  source_domain TEXT,
  source_title TEXT,
  citation_context TEXT,
  position_in_response INTEGER,
  
  -- Provider info
  provider TEXT NOT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for citations
CREATE INDEX IF NOT EXISTS idx_citations_scan_result_id ON citations(scan_result_id);
CREATE INDEX IF NOT EXISTS idx_citations_scan_id ON citations(scan_id);
CREATE INDEX IF NOT EXISTS idx_citations_brand_id ON citations(brand_id);
CREATE INDEX IF NOT EXISTS idx_citations_source_domain ON citations(source_domain);
CREATE INDEX IF NOT EXISTS idx_citations_created_at ON citations(created_at DESC);

-- ============================================
-- 3. Alert Configuration
-- ============================================
CREATE TABLE IF NOT EXISTS alert_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  
  -- Alert type: visibility_drop, competitor_spike, new_mention, sentiment_shift, first_citation
  alert_type TEXT NOT NULL,
  
  -- Threshold configuration (e.g., {"percentage": 10, "direction": "down"})
  threshold JSONB NOT NULL DEFAULT '{}',
  
  -- Notification channels: email, slack, in_app
  channels JSONB NOT NULL DEFAULT '["in_app"]',
  
  -- Webhook URL for custom integrations
  webhook_url TEXT,
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for alert_configs
CREATE INDEX IF NOT EXISTS idx_alert_configs_user_id ON alert_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_configs_brand_id ON alert_configs(brand_id);
CREATE INDEX IF NOT EXISTS idx_alert_configs_active ON alert_configs(is_active) WHERE is_active = true;

-- ============================================
-- 4. Alert History
-- ============================================
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES alert_configs(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  
  -- Alert details
  alert_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info', -- info, warning, critical
  
  -- Alert data
  data JSONB NOT NULL DEFAULT '{}',
  
  -- Delivery tracking
  sent_via TEXT[] NOT NULL DEFAULT '{}',
  
  -- Status
  is_read BOOLEAN NOT NULL DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for alerts
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_brand_id ON alerts(brand_id);
CREATE INDEX IF NOT EXISTS idx_alerts_config_id ON alerts(config_id);
CREATE INDEX IF NOT EXISTS idx_alerts_unread ON alerts(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_alerts_triggered_at ON alerts(triggered_at DESC);

-- ============================================
-- 5. Content Recommendations
-- ============================================
CREATE TABLE IF NOT EXISTS content_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES scans(id) ON DELETE SET NULL,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  
  -- Recommendation type: schema, content, keyword, entity, structure, citation
  recommendation_type TEXT NOT NULL,
  
  -- Priority: critical, high, medium, low
  priority TEXT NOT NULL DEFAULT 'medium',
  
  -- Recommendation content
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  action_items TEXT[] NOT NULL DEFAULT '{}',
  
  -- Impact estimation
  estimated_impact TEXT, -- high, medium, low
  estimated_effort TEXT, -- quick, moderate, significant
  
  -- Provider-specific recommendation
  target_provider TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, dismissed
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for content_recommendations
CREATE INDEX IF NOT EXISTS idx_content_recommendations_brand_id ON content_recommendations(brand_id);
CREATE INDEX IF NOT EXISTS idx_content_recommendations_scan_id ON content_recommendations(scan_id);
CREATE INDEX IF NOT EXISTS idx_content_recommendations_status ON content_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_content_recommendations_priority ON content_recommendations(priority);

-- ============================================
-- 6. Topic Gap Analysis
-- ============================================
CREATE TABLE IF NOT EXISTS topic_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  scan_id UUID REFERENCES scans(id) ON DELETE SET NULL,
  
  -- Topic details
  topic TEXT NOT NULL,
  topic_category TEXT,
  
  -- Gap analysis
  brand_coverage_score INTEGER NOT NULL DEFAULT 0, -- 0-100
  competitor_coverage_score INTEGER NOT NULL DEFAULT 0, -- 0-100
  gap_score INTEGER NOT NULL DEFAULT 0, -- competitor - brand
  
  -- Which competitors cover this topic
  covered_by_competitors TEXT[] NOT NULL DEFAULT '{}',
  
  -- Recommendations
  suggested_content_types TEXT[] NOT NULL DEFAULT '{}',
  priority TEXT NOT NULL DEFAULT 'medium',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for topic_gaps
CREATE INDEX IF NOT EXISTS idx_topic_gaps_brand_id ON topic_gaps(brand_id);
CREATE INDEX IF NOT EXISTS idx_topic_gaps_gap_score ON topic_gaps(gap_score DESC);

-- ============================================
-- 7. Query Fanouts Tracking
-- ============================================
CREATE TABLE IF NOT EXISTS query_fanouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  
  -- Original query
  original_query TEXT NOT NULL,
  
  -- Detected sub-queries/transformations
  sub_queries JSONB NOT NULL DEFAULT '[]',
  
  -- Analysis
  query_transformations INTEGER NOT NULL DEFAULT 0,
  semantic_variations TEXT[] NOT NULL DEFAULT '{}',
  
  -- Provider that showed fanouts
  provider TEXT NOT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for query_fanouts
CREATE INDEX IF NOT EXISTS idx_query_fanouts_scan_id ON query_fanouts(scan_id);
CREATE INDEX IF NOT EXISTS idx_query_fanouts_brand_id ON query_fanouts(brand_id);

-- ============================================
-- 8. Competitor Analysis Detail
-- ============================================
CREATE TABLE IF NOT EXISTS competitor_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  
  -- Competitor info
  competitor_name TEXT NOT NULL,
  
  -- Visibility metrics
  visibility_score INTEGER NOT NULL DEFAULT 0,
  mentions_count INTEGER NOT NULL DEFAULT 0,
  average_position NUMERIC(3,1),
  
  -- Provider breakdown
  provider_mentions JSONB NOT NULL DEFAULT '{}',
  
  -- Sentiment
  sentiment_positive INTEGER NOT NULL DEFAULT 0,
  sentiment_neutral INTEGER NOT NULL DEFAULT 0,
  sentiment_negative INTEGER NOT NULL DEFAULT 0,
  
  -- Share of Voice (percentage)
  share_of_voice NUMERIC(5,2) NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for competitor_analysis
CREATE INDEX IF NOT EXISTS idx_competitor_analysis_scan_id ON competitor_analysis(scan_id);
CREATE INDEX IF NOT EXISTS idx_competitor_analysis_brand_id ON competitor_analysis(brand_id);
CREATE INDEX IF NOT EXISTS idx_competitor_analysis_competitor ON competitor_analysis(competitor_name);

-- ============================================
-- 9. Add columns to existing tables
-- ============================================

-- Add hallucination tracking to scan_results
ALTER TABLE scan_results 
ADD COLUMN IF NOT EXISTS accuracy_score INTEGER,
ADD COLUMN IF NOT EXISTS has_hallucination BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS hallucination_details TEXT,
ADD COLUMN IF NOT EXISTS cited_sources TEXT[] DEFAULT '{}';

-- Add position tracking to scan_results
ALTER TABLE scan_results
ADD COLUMN IF NOT EXISTS mention_paragraph INTEGER,
ADD COLUMN IF NOT EXISTS is_above_fold BOOLEAN,
ADD COLUMN IF NOT EXISTS mention_prominence TEXT; -- 'featured', 'primary', 'secondary', 'mentioned'

-- ============================================
-- 10. RLS Policies
-- ============================================

-- Enable RLS on new tables
ALTER TABLE visibility_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_fanouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_analysis ENABLE ROW LEVEL SECURITY;

-- Visibility History policies
CREATE POLICY "Users can view own brand visibility history" ON visibility_history
  FOR SELECT USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

CREATE POLICY "Service role can manage visibility history" ON visibility_history
  FOR ALL USING (auth.role() = 'service_role');

-- Citations policies
CREATE POLICY "Users can view own brand citations" ON citations
  FOR SELECT USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

CREATE POLICY "Service role can manage citations" ON citations
  FOR ALL USING (auth.role() = 'service_role');

-- Alert configs policies
CREATE POLICY "Users can manage own alert configs" ON alert_configs
  FOR ALL USING (user_id = auth.uid());

-- Alerts policies
CREATE POLICY "Users can view own alerts" ON alerts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own alerts" ON alerts
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Service role can manage alerts" ON alerts
  FOR ALL USING (auth.role() = 'service_role');

-- Content recommendations policies
CREATE POLICY "Users can view own brand recommendations" ON content_recommendations
  FOR SELECT USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own recommendations" ON content_recommendations
  FOR UPDATE USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

CREATE POLICY "Service role can manage recommendations" ON content_recommendations
  FOR ALL USING (auth.role() = 'service_role');

-- Topic gaps policies
CREATE POLICY "Users can view own brand topic gaps" ON topic_gaps
  FOR SELECT USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

CREATE POLICY "Service role can manage topic gaps" ON topic_gaps
  FOR ALL USING (auth.role() = 'service_role');

-- Query fanouts policies
CREATE POLICY "Users can view own brand query fanouts" ON query_fanouts
  FOR SELECT USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

CREATE POLICY "Service role can manage query fanouts" ON query_fanouts
  FOR ALL USING (auth.role() = 'service_role');

-- Competitor analysis policies
CREATE POLICY "Users can view own brand competitor analysis" ON competitor_analysis
  FOR SELECT USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

CREATE POLICY "Service role can manage competitor analysis" ON competitor_analysis
  FOR ALL USING (auth.role() = 'service_role');
