-- Migration: Add Performance Indexes
-- Description: Optimizes database queries by adding indexes for common query patterns
-- Date: 2025-01-26

-- ============================================================
-- BRANDS TABLE INDEXES
-- ============================================================

-- Index for fetching user's brands (most common query)
-- Used in: brands list, brand count, brand updates
CREATE INDEX IF NOT EXISTS idx_brands_user_id
  ON brands(user_id);

-- Composite index for primary brand lookup (dashboard)
-- Used in: dashboard page to fetch primary brand
CREATE INDEX IF NOT EXISTS idx_brands_user_primary
  ON brands(user_id, is_primary)
  WHERE is_primary = true;

-- Composite index for industry filtering
-- Used in: brands list with industry filter
CREATE INDEX IF NOT EXISTS idx_brands_user_industry
  ON brands(user_id, industry);

-- Index for brand listing with ordering
-- Used in: brands list ordered by is_primary and created_at
CREATE INDEX IF NOT EXISTS idx_brands_user_listing
  ON brands(user_id, is_primary DESC, created_at DESC);

-- ============================================================
-- SCANS TABLE INDEXES
-- ============================================================

-- Index for user's scans (required for RLS and listing)
-- Used in: scans list, scan authorization
CREATE INDEX IF NOT EXISTS idx_scans_user_id
  ON scans(user_id);

-- Index for brand's scans
-- Used in: recent scans for a brand, scan count by brand
CREATE INDEX IF NOT EXISTS idx_scans_brand_id
  ON scans(brand_id);

-- Composite index for dashboard query (completed scans by brand)
-- Used in: dashboard to get latest completed scan with insights
CREATE INDEX IF NOT EXISTS idx_scans_brand_status_completed
  ON scans(brand_id, status, completed_at DESC)
  WHERE status = 'completed';

-- Composite index for scans listing with ordering
-- Used in: scans list ordered by created_at
CREATE INDEX IF NOT EXISTS idx_scans_user_created
  ON scans(user_id, created_at DESC);

-- Composite index for scan status filtering
-- Used in: scans list with status filter
CREATE INDEX IF NOT EXISTS idx_scans_user_status
  ON scans(user_id, status);

-- Index for single scan lookup by id and user
-- Used in: scan detail page, scan authorization
CREATE INDEX IF NOT EXISTS idx_scans_id_user
  ON scans(id, user_id);

-- ============================================================
-- QUERY_TEMPLATES TABLE INDEXES
-- ============================================================

-- Composite index for template lookup by industry
-- Used in: dashboard to get templates for brand's industry
CREATE INDEX IF NOT EXISTS idx_query_templates_industry_active
  ON query_templates(industry, is_active)
  WHERE is_active = true;

-- ============================================================
-- SCAN_QUERIES TABLE INDEXES
-- ============================================================

-- Index for queries by scan (foreign key)
-- Used in: scan detail to get associated queries
CREATE INDEX IF NOT EXISTS idx_scan_queries_scan_id
  ON scan_queries(scan_id);

-- ============================================================
-- SCAN_RESULTS TABLE INDEXES
-- ============================================================

-- Index for results by scan (foreign key)
-- Used in: scan detail to get provider results
CREATE INDEX IF NOT EXISTS idx_scan_results_scan_id
  ON scan_results(scan_id);

-- Composite index for results by provider
-- Used in: provider-specific analytics
CREATE INDEX IF NOT EXISTS idx_scan_results_scan_provider
  ON scan_results(scan_id, provider);

-- ============================================================
-- INSIGHTS TABLE INDEXES
-- ============================================================

-- Index for insights by scan (foreign key)
-- Used in: scan detail, dashboard to get scan insights
CREATE INDEX IF NOT EXISTS idx_insights_scan_id
  ON insights(scan_id);

-- ============================================================
-- USERS TABLE INDEXES (if not already indexed)
-- ============================================================

-- Note: users.id should already be primary key and indexed
-- No additional indexes needed as all queries use primary key

-- ============================================================
-- ANALYZE TABLES
-- ============================================================

-- Update table statistics for query planner
ANALYZE brands;
ANALYZE scans;
ANALYZE query_templates;
ANALYZE scan_queries;
ANALYZE scan_results;
ANALYZE insights;
