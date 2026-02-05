// ============================================
// 배치 스캔 시스템 타입 정의
// ============================================

// ============================================
// 1. 기본 Enum 타입
// ============================================

export type BatchScanStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed';
export type QuestionScanStatus = 'pending' | 'running' | 'completed' | 'failed';
export type IterationStatus = 'pending' | 'success' | 'failed' | 'timeout';
export type PauseReason = 'network_error' | 'insufficient_credits' | 'user_paused' | 'rate_limit' | 'auth_error';
export type BatchProvider = 'gemini' | 'openai';
export type SentimentType = 'positive' | 'neutral' | 'negative';

// ============================================
// 2. 질문 세트 타입
// ============================================

export interface QuestionSet {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuestionSetItem {
  id: string;
  question_set_id: string;
  question_text: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
}

export interface QuestionSetWithItems extends QuestionSet {
  items: QuestionSetItem[];
}

// ============================================
// 3. 사용자 스캔 설정 타입
// ============================================

export interface UserScanSettings {
  id: string;
  user_id: string;
  gemini_iterations: number;
  openai_iterations: number;
  timeout_per_call_ms: number;
  default_brand_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserScanSettingsInput {
  gemini_iterations?: number;
  openai_iterations?: number;
  timeout_per_call_ms?: number;
  default_brand_id?: string | null;
}

export const DEFAULT_SCAN_SETTINGS: Omit<UserScanSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  gemini_iterations: 50,
  openai_iterations: 50,
  timeout_per_call_ms: 30000,
  default_brand_id: null,
};

// ============================================
// 4. 배치 스캔 타입
// ============================================

export interface BatchScan {
  id: string;
  user_id: string;
  brand_id: string;
  question_set_id: string | null;
  status: BatchScanStatus;
  pause_reason: PauseReason | null;
  total_questions: number;
  completed_questions: number;
  total_iterations: number;
  completed_iterations: number;
  estimated_credits: number;
  used_credits: number;
  overall_exposure_rate: number | null;
  settings_snapshot: SettingsSnapshot | null;
  estimated_duration_ms: number | null;
  started_at: string | null;
  paused_at: string | null;
  resumed_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface SettingsSnapshot {
  gemini_iterations: number;
  openai_iterations: number;
  timeout_per_call_ms: number;
  brand_name: string;
  brand_keywords: string[];
  brand_competitors: string[];
}

export interface BatchScanWithDetails extends BatchScan {
  brand_name?: string;
  question_set_name?: string;
  questions?: BatchScanQuestion[];
}

// ============================================
// 5. 배치 스캔 질문 타입
// ============================================

export interface BatchScanQuestion {
  id: string;
  batch_scan_id: string;
  question_set_item_id: string | null;
  question_text: string;
  question_order: number;
  status: QuestionScanStatus;
  gemini_completed: number;
  gemini_total: number;
  openai_completed: number;
  openai_total: number;
  gemini_mention_count: number;
  openai_mention_count: number;
  gemini_exposure_rate: number | null;
  openai_exposure_rate: number | null;
  avg_exposure_rate: number | null;
  competitor_mentions: Record<string, number>;
  sentiment_positive: number;
  sentiment_neutral: number;
  sentiment_negative: number;
  last_error: string | null;
  retry_count: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface BatchScanQuestionWithIterations extends BatchScanQuestion {
  iterations?: BatchScanIteration[];
}

// ============================================
// 6. 개별 API 콜 결과 타입
// ============================================

export interface BatchScanIteration {
  id: string;
  batch_scan_question_id: string;
  provider: BatchProvider;
  iteration_index: number;
  status: IterationStatus;
  response_text: string | null;
  brand_mentioned: boolean | null;
  mention_position: number | null;
  sentiment: SentimentType | null;
  competitors_mentioned: Record<string, boolean> | null;
  citations: Citation[] | null;
  response_time_ms: number | null;
  error_message: string | null;
  created_at: string;
}

export interface Citation {
  url: string;
  title?: string;
}

// ============================================
// 7. API 요청/응답 타입
// ============================================

// 질문 세트 CRUD
export interface CreateQuestionSetInput {
  name: string;
  description?: string;
  questions: string[];
}

export interface UpdateQuestionSetInput {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface AddQuestionItemInput {
  question_text: string;
  order_index?: number;
}

export interface UpdateQuestionItemInput {
  question_text?: string;
  order_index?: number;
  is_active?: boolean;
}

export interface ReorderQuestionsInput {
  items: Array<{ id: string; order_index: number }>;
}

// 배치 스캔 생성
export interface CreateBatchScanInput {
  question_set_id: string;
}

// 배치 스캔 목록 조회
export interface BatchScanListParams {
  limit?: number;
  offset?: number;
  status?: BatchScanStatus;
}

// API 응답
export interface QuestionSetsResponse {
  sets: QuestionSet[];
}

export interface QuestionSetResponse {
  set: QuestionSetWithItems;
}

export interface BatchScanResponse {
  batchScan: BatchScanWithDetails;
}

export interface BatchScansResponse {
  batchScans: BatchScanWithDetails[];
  pagination: {
    limit: number;
    offset: number;
    total: number | null;
  };
}

// ============================================
// 8. 스캔 미리보기 타입
// ============================================

export interface ScanPreview {
  questions: Array<{
    text: string;
    geminiIterations: number;
    openaiIterations: number;
  }>;
  totals: {
    totalQuestions: number;
    geminiIterations: number;
    openaiIterations: number;
    totalIterations: number;
    estimatedCredits: number;
    estimatedDurationMin: string;
    estimatedDurationMax: string;
  };
  brand: {
    id: string;
    name: string;
    competitors: string[];
  };
  hasEnoughCredits: boolean;
  userCredits: number;
}

// ============================================
// 9. Inngest 이벤트 타입
// ============================================

export interface BatchScanStartEvent {
  name: 'batch-scan/v2.start';
  data: {
    batchScanId: string;
    userId: string;
  };
}

export interface BatchScanResumeEvent {
  name: 'batch-scan/v2.resume';
  data: {
    batchScanId: string;
    userId: string;
  };
}

export interface BatchScanCompletedEvent {
  name: 'batch-scan/v2.completed';
  data: {
    batchScanId: string;
    userId: string;
    overallExposureRate: number;
    totalQuestions: number;
    timestamp: string;
  };
}

export interface BatchScanFailedEvent {
  name: 'batch-scan/v2.failed';
  data: {
    batchScanId: string;
    userId: string;
    reason: string;
    timestamp: string;
  };
}

// ============================================
// 10. 집계 타입
// ============================================

export interface ExposureAggregation {
  geminiExposureRate: number;
  openaiExposureRate: number;
  avgExposureRate: number;
  totalMentions: number;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  competitorMentions: Record<string, number>;
}

export interface BatchScanSummary {
  id: string;
  status: BatchScanStatus;
  progressPercent: number;
  brandName: string;
  questionSetName: string | null;
  totalQuestions: number;
  completedQuestions: number;
  overallExposureRate: number | null;
  usedCredits: number;
  estimatedCredits: number;
  createdAt: string;
  completedAt: string | null;
}

// ============================================
// 11. 유틸리티 타입
// ============================================

export type BatchScanStatusColor = {
  pending: 'gray';
  running: 'blue';
  paused: 'yellow';
  completed: 'green';
  failed: 'red';
};

export const BATCH_SCAN_STATUS_LABELS: Record<BatchScanStatus, string> = {
  pending: '대기 중',
  running: '진행 중',
  paused: '일시정지',
  completed: '완료',
  failed: '실패',
};

export const QUESTION_STATUS_LABELS: Record<QuestionScanStatus, string> = {
  pending: '대기',
  running: '진행 중',
  completed: '완료',
  failed: '실패',
};

export const PAUSE_REASON_LABELS: Record<PauseReason, string> = {
  network_error: '네트워크 오류',
  insufficient_credits: '크레딧 부족',
  user_paused: '사용자 일시정지',
  rate_limit: 'API 요청 한도 초과',
  auth_error: '인증 오류',
};
