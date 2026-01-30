-- Migration: Create Base Tables for Fantascan AI
-- Description: Creates all core tables for brand visibility monitoring
-- Date: 2025-01-01

-- ============================================================
-- EXTENSION SETUP
-- ============================================================
-- Use gen_random_uuid() which is built into PostgreSQL 13+
-- (Supabase uses this by default)

-- ============================================================
-- ENUM TYPES
-- ============================================================

-- Subscription tiers
CREATE TYPE subscription_tier AS ENUM ('free', 'starter', 'pro');

-- Scan status
CREATE TYPE scan_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Provider types (AI and Search providers)
CREATE TYPE provider_type AS ENUM ('gemini', 'openai', 'anthropic', 'grok', 'perplexity', 'google_search');

-- Provider categories
CREATE TYPE provider_category AS ENUM ('ai', 'search');

-- Industry types
CREATE TYPE industry_type AS ENUM (
  'fintech', 'ecommerce', 'saas', 'education', 'healthcare',
  'fnb', 'beauty', 'travel', 'realestate', 'other'
);

-- Query types
CREATE TYPE query_type AS ENUM ('recommendation', 'comparison', 'review', 'ranking');

-- Scan types
CREATE TYPE scan_type AS ENUM ('full', 'single', 'initial');

-- Result status
CREATE TYPE result_status AS ENUM ('success', 'error');

-- Sentiment types
CREATE TYPE sentiment_type AS ENUM ('positive', 'neutral', 'negative');

-- Insight types and priorities
CREATE TYPE insight_type AS ENUM ('improvement', 'strength', 'opportunity', 'threat');
CREATE TYPE insight_priority AS ENUM ('high', 'medium', 'low');

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  plan subscription_tier DEFAULT 'free',
  credits INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BRANDS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  industry industry_type NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  competitors TEXT[] DEFAULT '{}',
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SCANS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scan_type scan_type DEFAULT 'full',
  status scan_status DEFAULT 'pending',
  visibility_score DECIMAL(5,2),
  ai_visibility_score DECIMAL(5,2),
  seo_visibility_score DECIMAL(5,2),
  mentions_count INTEGER DEFAULT 0,
  total_providers INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================================
-- SCAN QUERIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS scan_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  query_type query_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SCAN RESULTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS scan_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  query_id UUID REFERENCES scan_queries(id) ON DELETE SET NULL,
  provider provider_type NOT NULL,
  provider_category provider_category NOT NULL,
  status result_status DEFAULT 'success',
  content TEXT,
  brand_mentioned BOOLEAN DEFAULT false,
  mention_position INTEGER,
  mention_context TEXT,
  sentiment sentiment_type,
  competitor_mentions JSONB DEFAULT '{}',
  response_time_ms INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Extended fields for analytics
  accuracy_score DECIMAL(5,2),
  has_hallucination BOOLEAN DEFAULT false,
  hallucination_details TEXT,
  cited_sources TEXT[] DEFAULT '{}',
  mention_paragraph INTEGER,
  is_above_fold BOOLEAN,
  mention_prominence TEXT CHECK (mention_prominence IN ('featured', 'primary', 'secondary', 'mentioned'))
);

-- ============================================================
-- INSIGHTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  insight_type insight_type NOT NULL,
  priority insight_priority DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  action_items TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- QUERY TEMPLATES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS query_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry industry_type NOT NULL,
  query_type query_type NOT NULL,
  template_ko TEXT NOT NULL,
  template_en TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BASIC INDEXES
-- ============================================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Brands
CREATE INDEX IF NOT EXISTS idx_brands_user_id ON brands(user_id);
CREATE INDEX IF NOT EXISTS idx_brands_industry ON brands(industry);

-- Scans
CREATE INDEX IF NOT EXISTS idx_scans_brand_id ON scans(brand_id);
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_status ON scans(status);
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at DESC);

-- Scan Results
CREATE INDEX IF NOT EXISTS idx_scan_results_scan_id ON scan_results(scan_id);
CREATE INDEX IF NOT EXISTS idx_scan_results_provider ON scan_results(provider);
CREATE INDEX IF NOT EXISTS idx_scan_results_brand_mentioned ON scan_results(brand_mentioned);

-- Insights
CREATE INDEX IF NOT EXISTS idx_insights_scan_id ON insights(scan_id);
CREATE INDEX IF NOT EXISTS idx_insights_brand_id ON insights(brand_id);

-- Query Templates
CREATE INDEX IF NOT EXISTS idx_query_templates_industry ON query_templates(industry);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for brands
DROP TRIGGER IF EXISTS update_brands_updated_at ON brands;
CREATE TRIGGER update_brands_updated_at
  BEFORE UPDATE ON brands
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_templates ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Brands policies
CREATE POLICY "Users can view own brands" ON brands
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create brands" ON brands
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own brands" ON brands
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own brands" ON brands
  FOR DELETE USING (auth.uid() = user_id);

-- Scans policies
CREATE POLICY "Users can view own scans" ON scans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create scans" ON scans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scans" ON scans
  FOR UPDATE USING (auth.uid() = user_id);

-- Scan queries policies
CREATE POLICY "Users can view own scan queries" ON scan_queries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM scans WHERE scans.id = scan_queries.scan_id AND scans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create scan queries" ON scan_queries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM scans WHERE scans.id = scan_queries.scan_id AND scans.user_id = auth.uid()
    )
  );

-- Scan results policies
CREATE POLICY "Users can view own scan results" ON scan_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM scans WHERE scans.id = scan_results.scan_id AND scans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create scan results" ON scan_results
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM scans WHERE scans.id = scan_results.scan_id AND scans.user_id = auth.uid()
    )
  );

-- Insights policies
CREATE POLICY "Users can view own insights" ON insights
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM brands WHERE brands.id = insights.brand_id AND brands.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create insights" ON insights
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM brands WHERE brands.id = insights.brand_id AND brands.user_id = auth.uid()
    )
  );

-- Query templates - everyone can read
CREATE POLICY "Everyone can view query templates" ON query_templates
  FOR SELECT USING (true);

-- ============================================================
-- SEED DATA: Query Templates
-- ============================================================

INSERT INTO query_templates (industry, query_type, template_ko, template_en) VALUES
-- Fintech
('fintech', 'recommendation', '최고의 {brand_type} 앱 추천해줘', 'Recommend the best {brand_type} app'),
('fintech', 'comparison', '{brand} vs 경쟁사 비교해줘', 'Compare {brand} vs competitors'),
('fintech', 'review', '{brand} 사용 후기 알려줘', 'Tell me about {brand} reviews'),
('fintech', 'ranking', '인기 {brand_type} 순위 알려줘', 'What are the top {brand_type} rankings'),

-- E-commerce
('ecommerce', 'recommendation', '좋은 {brand_type} 쇼핑몰 추천해줘', 'Recommend good {brand_type} shopping sites'),
('ecommerce', 'comparison', '{brand}와 비슷한 쇼핑몰 알려줘', 'Tell me about shopping sites similar to {brand}'),
('ecommerce', 'review', '{brand} 배송 후기 어때?', 'How is {brand} delivery review?'),
('ecommerce', 'ranking', '인기 온라인 쇼핑몰 순위', 'Popular online shopping site rankings'),

-- SaaS
('saas', 'recommendation', '최고의 {brand_type} 소프트웨어 추천', 'Recommend the best {brand_type} software'),
('saas', 'comparison', '{brand} 대체할 수 있는 서비스', 'Services that can replace {brand}'),
('saas', 'review', '{brand} 가격 대비 성능 어때?', 'How is {brand} performance for the price?'),
('saas', 'ranking', '기업용 {brand_type} 솔루션 순위', 'Enterprise {brand_type} solution rankings'),

-- Education
('education', 'recommendation', '좋은 {brand_type} 교육 플랫폼 추천', 'Recommend good {brand_type} education platforms'),
('education', 'comparison', '{brand}와 다른 교육 서비스 비교', 'Compare {brand} with other education services'),
('education', 'review', '{brand} 강의 퀄리티 어때?', 'How is {brand} lecture quality?'),
('education', 'ranking', '인기 온라인 교육 플랫폼 순위', 'Popular online education platform rankings'),

-- Healthcare
('healthcare', 'recommendation', '좋은 {brand_type} 헬스케어 앱 추천', 'Recommend good {brand_type} healthcare apps'),
('healthcare', 'comparison', '{brand} 건강관리 앱 비교', '{brand} health management app comparison'),
('healthcare', 'review', '{brand} 정확도 어때?', 'How accurate is {brand}?'),
('healthcare', 'ranking', '인기 건강 앱 순위', 'Popular health app rankings'),

-- F&B
('fnb', 'recommendation', '맛있는 {brand_type} 맛집 추천해줘', 'Recommend delicious {brand_type} restaurants'),
('fnb', 'comparison', '{brand}와 비슷한 음식점 알려줘', 'Tell me restaurants similar to {brand}'),
('fnb', 'review', '{brand} 음식 맛 어때?', 'How is {brand} food taste?'),
('fnb', 'ranking', '인기 {brand_type} 프랜차이즈 순위', 'Popular {brand_type} franchise rankings'),

-- Beauty
('beauty', 'recommendation', '좋은 {brand_type} 화장품 추천', 'Recommend good {brand_type} cosmetics'),
('beauty', 'comparison', '{brand}와 비슷한 브랜드 비교', 'Compare brands similar to {brand}'),
('beauty', 'review', '{brand} 제품 후기 알려줘', 'Tell me about {brand} product reviews'),
('beauty', 'ranking', '인기 화장품 브랜드 순위', 'Popular cosmetics brand rankings'),

-- Travel
('travel', 'recommendation', '좋은 {brand_type} 여행사 추천', 'Recommend good {brand_type} travel agencies'),
('travel', 'comparison', '{brand}와 다른 여행 플랫폼 비교', 'Compare {brand} with other travel platforms'),
('travel', 'review', '{brand} 이용 후기 어때?', 'How are {brand} user reviews?'),
('travel', 'ranking', '인기 여행 앱 순위', 'Popular travel app rankings'),

-- Real Estate
('realestate', 'recommendation', '좋은 {brand_type} 부동산 앱 추천', 'Recommend good {brand_type} real estate apps'),
('realestate', 'comparison', '{brand}와 다른 부동산 플랫폼 비교', 'Compare {brand} with other real estate platforms'),
('realestate', 'review', '{brand} 매물 정보 정확해?', 'Is {brand} property information accurate?'),
('realestate', 'ranking', '인기 부동산 앱 순위', 'Popular real estate app rankings'),

-- Other
('other', 'recommendation', '좋은 {brand_type} 서비스 추천해줘', 'Recommend good {brand_type} services'),
('other', 'comparison', '{brand}와 비슷한 서비스 비교', 'Compare services similar to {brand}'),
('other', 'review', '{brand} 사용 후기 알려줘', 'Tell me about {brand} user reviews'),
('other', 'ranking', '인기 {brand_type} 순위', 'Popular {brand_type} rankings')
ON CONFLICT DO NOTHING;
