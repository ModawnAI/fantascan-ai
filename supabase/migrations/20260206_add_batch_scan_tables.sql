-- ============================================
-- FantaScan AI - 배치 스캔 시스템 마이그레이션
-- 작성일: 2026-02-06
-- 멱등성(Idempotent) 보장
-- ============================================

-- ============================================
-- 0. ENUM 타입 (강제 재생성)
-- ============================================
DROP TYPE IF EXISTS batch_scan_status CASCADE;
CREATE TYPE batch_scan_status AS ENUM ('pending', 'running', 'paused', 'completed', 'failed');

DROP TYPE IF EXISTS pause_reason CASCADE;
CREATE TYPE pause_reason AS ENUM ('network_error', 'insufficient_credits', 'user_paused', 'rate_limit', 'auth_error');

DROP TYPE IF EXISTS question_scan_status CASCADE;
CREATE TYPE question_scan_status AS ENUM ('pending', 'running', 'completed', 'failed');

DROP TYPE IF EXISTS iteration_status CASCADE;
CREATE TYPE iteration_status AS ENUM ('pending', 'success', 'failed', 'timeout');

DROP TYPE IF EXISTS provider_type_v2 CASCADE;
CREATE TYPE provider_type_v2 AS ENUM ('gemini', 'openai');

DROP TYPE IF EXISTS sentiment_type CASCADE;
CREATE TYPE sentiment_type AS ENUM ('positive', 'neutral', 'negative');

-- ============================================
-- 1. 질문 세트 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS question_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_sets_user ON question_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_question_sets_active ON question_sets(user_id, is_active);

ALTER TABLE question_sets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own question sets" ON question_sets FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create own question sets" ON question_sets FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own question sets" ON question_sets FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own question sets" ON question_sets FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 2. 질문 세트 항목 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS question_set_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_set_id UUID NOT NULL REFERENCES question_sets(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_set_items_set ON question_set_items(question_set_id);
CREATE INDEX IF NOT EXISTS idx_question_set_items_order ON question_set_items(question_set_id, order_index);

ALTER TABLE question_set_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own question set items" ON question_set_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM question_sets WHERE question_sets.id = question_set_items.question_set_id AND question_sets.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create own question set items" ON question_set_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM question_sets WHERE question_sets.id = question_set_items.question_set_id AND question_sets.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own question set items" ON question_set_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM question_sets WHERE question_sets.id = question_set_items.question_set_id AND question_sets.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own question set items" ON question_set_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM question_sets WHERE question_sets.id = question_set_items.question_set_id AND question_sets.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 3. 사용자 스캔 설정 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS user_scan_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  gemini_iterations INTEGER DEFAULT 50 CHECK (gemini_iterations >= 1 AND gemini_iterations <= 100),
  openai_iterations INTEGER DEFAULT 50 CHECK (openai_iterations >= 1 AND openai_iterations <= 100),
  timeout_per_call_ms INTEGER DEFAULT 30000 CHECK (timeout_per_call_ms >= 5000 AND timeout_per_call_ms <= 120000),
  default_brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_scan_settings_user ON user_scan_settings(user_id);

ALTER TABLE user_scan_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own scan settings" ON user_scan_settings FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create own scan settings" ON user_scan_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own scan settings" ON user_scan_settings FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 4. 배치 스캔 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS batch_scans_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  question_set_id UUID REFERENCES question_sets(id) ON DELETE SET NULL,
  status batch_scan_status DEFAULT 'pending',
  pause_reason pause_reason,
  total_questions INTEGER NOT NULL,
  completed_questions INTEGER DEFAULT 0,
  total_iterations INTEGER NOT NULL,
  completed_iterations INTEGER DEFAULT 0,
  estimated_credits INTEGER NOT NULL,
  used_credits INTEGER DEFAULT 0,
  overall_exposure_rate DECIMAL(5,2),
  settings_snapshot JSONB,
  estimated_duration_ms BIGINT,
  started_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  resumed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_batch_scans_v2_user ON batch_scans_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_batch_scans_v2_brand ON batch_scans_v2(brand_id);
CREATE INDEX IF NOT EXISTS idx_batch_scans_v2_status ON batch_scans_v2(status);
CREATE INDEX IF NOT EXISTS idx_batch_scans_v2_created ON batch_scans_v2(user_id, created_at DESC);

ALTER TABLE batch_scans_v2 ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own batch scans" ON batch_scans_v2 FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create own batch scans" ON batch_scans_v2 FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own batch scans" ON batch_scans_v2 FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 5. 배치 스캔 질문 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS batch_scan_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_scan_id UUID NOT NULL REFERENCES batch_scans_v2(id) ON DELETE CASCADE,
  question_set_item_id UUID REFERENCES question_set_items(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  question_order INTEGER NOT NULL,
  status question_scan_status DEFAULT 'pending',
  gemini_completed INTEGER DEFAULT 0,
  gemini_total INTEGER NOT NULL,
  openai_completed INTEGER DEFAULT 0,
  openai_total INTEGER NOT NULL,
  gemini_mention_count INTEGER DEFAULT 0,
  openai_mention_count INTEGER DEFAULT 0,
  gemini_exposure_rate DECIMAL(5,2),
  openai_exposure_rate DECIMAL(5,2),
  avg_exposure_rate DECIMAL(5,2),
  competitor_mentions JSONB DEFAULT '{}',
  sentiment_positive INTEGER DEFAULT 0,
  sentiment_neutral INTEGER DEFAULT 0,
  sentiment_negative INTEGER DEFAULT 0,
  last_error TEXT,
  retry_count INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_batch_scan_questions_batch ON batch_scan_questions(batch_scan_id);
CREATE INDEX IF NOT EXISTS idx_batch_scan_questions_status ON batch_scan_questions(batch_scan_id, status);

ALTER TABLE batch_scan_questions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own batch scan questions" ON batch_scan_questions FOR SELECT
  USING (EXISTS (SELECT 1 FROM batch_scans_v2 WHERE batch_scans_v2.id = batch_scan_questions.batch_scan_id AND batch_scans_v2.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create own batch scan questions" ON batch_scan_questions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM batch_scans_v2 WHERE batch_scans_v2.id = batch_scan_questions.batch_scan_id AND batch_scans_v2.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own batch scan questions" ON batch_scan_questions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM batch_scans_v2 WHERE batch_scans_v2.id = batch_scan_questions.batch_scan_id AND batch_scans_v2.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 6. 개별 API 콜 결과 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS batch_scan_iterations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_scan_question_id UUID NOT NULL REFERENCES batch_scan_questions(id) ON DELETE CASCADE,
  provider provider_type_v2 NOT NULL,
  iteration_index INTEGER NOT NULL,
  status iteration_status DEFAULT 'pending',
  response_text TEXT,
  brand_mentioned BOOLEAN,
  mention_position INTEGER,
  sentiment sentiment_type,
  competitors_mentioned JSONB,
  citations JSONB,
  response_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_iterations_question ON batch_scan_iterations(batch_scan_question_id);
CREATE INDEX IF NOT EXISTS idx_iterations_provider ON batch_scan_iterations(batch_scan_question_id, provider);
CREATE INDEX IF NOT EXISTS idx_iterations_status ON batch_scan_iterations(batch_scan_question_id, status);

ALTER TABLE batch_scan_iterations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own batch scan iterations" ON batch_scan_iterations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM batch_scan_questions bsq
    JOIN batch_scans_v2 bs ON bs.id = bsq.batch_scan_id
    WHERE bsq.id = batch_scan_iterations.batch_scan_question_id AND bs.user_id = auth.uid()
  ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create own batch scan iterations" ON batch_scan_iterations FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM batch_scan_questions bsq
    JOIN batch_scans_v2 bs ON bs.id = bsq.batch_scan_id
    WHERE bsq.id = batch_scan_iterations.batch_scan_question_id AND bs.user_id = auth.uid()
  ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own batch scan iterations" ON batch_scan_iterations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM batch_scan_questions bsq
    JOIN batch_scans_v2 bs ON bs.id = bsq.batch_scan_id
    WHERE bsq.id = batch_scan_iterations.batch_scan_question_id AND bs.user_id = auth.uid()
  ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 7. 트리거: updated_at 자동 업데이트
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_question_sets_updated_at ON question_sets;
CREATE TRIGGER update_question_sets_updated_at
  BEFORE UPDATE ON question_sets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_scan_settings_updated_at ON user_scan_settings;
CREATE TRIGGER update_user_scan_settings_updated_at
  BEFORE UPDATE ON user_scan_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. 함수: 질문 세트 마지막 사용 시간 업데이트
-- ============================================
CREATE OR REPLACE FUNCTION update_question_set_last_used()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.question_set_id IS NOT NULL THEN
    UPDATE question_sets
    SET last_used_at = NOW()
    WHERE id = NEW.question_set_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_question_set_usage ON batch_scans_v2;
CREATE TRIGGER update_question_set_usage
  AFTER INSERT ON batch_scans_v2
  FOR EACH ROW
  EXECUTE FUNCTION update_question_set_last_used();

-- ============================================
-- 9. 뷰: 배치 스캔 요약
-- ============================================
CREATE OR REPLACE VIEW batch_scan_summary AS
SELECT 
  bs.id,
  bs.user_id,
  bs.brand_id,
  bs.question_set_id,
  bs.status,
  bs.total_questions,
  bs.completed_questions,
  bs.total_iterations,
  bs.completed_iterations,
  bs.estimated_credits,
  bs.used_credits,
  bs.overall_exposure_rate,
  bs.created_at,
  bs.started_at,
  bs.completed_at,
  b.name AS brand_name,
  qs.name AS question_set_name,
  CASE 
    WHEN bs.total_iterations > 0 
    THEN ROUND((bs.completed_iterations::DECIMAL / bs.total_iterations) * 100, 1)
    ELSE 0
  END AS progress_percent
FROM batch_scans_v2 bs
LEFT JOIN brands b ON b.id = bs.brand_id
LEFT JOIN question_sets qs ON qs.id = bs.question_set_id;

-- ============================================
-- 10. Helper RPC Function
-- ============================================
CREATE OR REPLACE FUNCTION increment_field(
  table_name TEXT,
  field_name TEXT,
  row_id UUID,
  amount INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET %I = COALESCE(%I, 0) + $1 WHERE id = $2',
    table_name, field_name, field_name
  ) USING amount, row_id;
END;
$$;

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE question_sets IS '사용자의 질문 세트 (여러 질문 그룹)';
COMMENT ON TABLE question_set_items IS '질문 세트 내 개별 질문';
COMMENT ON TABLE user_scan_settings IS '사용자별 스캔 설정 (프로바이더 반복 횟수 등)';
COMMENT ON TABLE batch_scans_v2 IS '배치 스캔 실행 기록';
COMMENT ON TABLE batch_scan_questions IS '배치 스캔 내 개별 질문 진행 상황';
COMMENT ON TABLE batch_scan_iterations IS '개별 API 콜 결과';
