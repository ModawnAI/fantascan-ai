-- Migration: Fix Schema Column Names
-- Description: Updates column names in scan_results and insights tables to match TypeScript types
-- Date: 2025-01-26

-- ============================================================
-- SCAN_RESULTS TABLE UPDATES
-- ============================================================

-- Add query_id column if it doesn't exist
ALTER TABLE scan_results
ADD COLUMN IF NOT EXISTS query_id UUID REFERENCES scan_queries(id) ON DELETE CASCADE;

-- Rename sentiment to sentiment_score if sentiment exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'scan_results' AND column_name = 'sentiment'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'scan_results' AND column_name = 'sentiment_score'
    ) THEN
        ALTER TABLE scan_results RENAME COLUMN sentiment TO sentiment_score;
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'scan_results' AND column_name = 'sentiment_score'
    ) THEN
        ALTER TABLE scan_results ADD COLUMN sentiment_score INTEGER;
    END IF;
END $$;

-- Rename competitors_mentioned to competitor_mentions if competitors_mentioned exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'scan_results' AND column_name = 'competitors_mentioned'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'scan_results' AND column_name = 'competitor_mentions'
    ) THEN
        ALTER TABLE scan_results RENAME COLUMN competitors_mentioned TO competitor_mentions;
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'scan_results' AND column_name = 'competitor_mentions'
    ) THEN
        ALTER TABLE scan_results ADD COLUMN competitor_mentions JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Add response_time_ms column if it doesn't exist
ALTER TABLE scan_results
ADD COLUMN IF NOT EXISTS response_time_ms INTEGER DEFAULT 0;

-- ============================================================
-- INSIGHTS TABLE UPDATES
-- ============================================================

-- Add brand_id column if it doesn't exist
ALTER TABLE insights
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;

-- Add provider_scores column if it doesn't exist
ALTER TABLE insights
ADD COLUMN IF NOT EXISTS provider_scores JSONB DEFAULT '{}'::jsonb;

-- Rename competitor_analysis to competitor_comparison if competitor_analysis exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'insights' AND column_name = 'competitor_analysis'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'insights' AND column_name = 'competitor_comparison'
    ) THEN
        ALTER TABLE insights RENAME COLUMN competitor_analysis TO competitor_comparison;
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'insights' AND column_name = 'competitor_comparison'
    ) THEN
        ALTER TABLE insights ADD COLUMN competitor_comparison JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Add trend_direction column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'insights' AND column_name = 'trend_direction'
    ) THEN
        ALTER TABLE insights ADD COLUMN trend_direction TEXT DEFAULT 'stable';
    END IF;
END $$;

-- ============================================================
-- UPDATE INDEXES
-- ============================================================

-- Add index on scan_results.query_id
CREATE INDEX IF NOT EXISTS idx_scan_results_query_id
  ON scan_results(query_id);

-- Add index on insights.brand_id
CREATE INDEX IF NOT EXISTS idx_insights_brand_id
  ON insights(brand_id);

-- ============================================================
-- ANALYZE TABLES
-- ============================================================

ANALYZE scan_results;
ANALYZE insights;
