// ============================================
// 크레딧 계산 유틸리티
// ============================================

import type { BatchProvider } from '@/types/batch-scan';

/**
 * 프로바이더별 크레딧 비용
 */
export const CREDIT_COSTS: Record<BatchProvider, number> = {
  gemini: 1,
  openai: 2,
} as const;

/**
 * 프로바이더별 평균 응답 시간 (ms)
 */
export const AVG_RESPONSE_TIME: Record<BatchProvider, number> = {
  gemini: 2500,
  openai: 3500,
} as const;

// ============================================
// 크레딧 계산
// ============================================

export interface CreditEstimate {
  geminiCredits: number;
  openaiCredits: number;
  totalCredits: number;
  geminiIterations: number;
  openaiIterations: number;
  totalIterations: number;
}

/**
 * 예상 크레딧 계산
 */
export function calculateEstimatedCredits(
  questionCount: number,
  geminiIterations: number,
  openaiIterations: number
): CreditEstimate {
  const totalGeminiIterations = questionCount * geminiIterations;
  const totalOpenaiIterations = questionCount * openaiIterations;
  
  const geminiCredits = totalGeminiIterations * CREDIT_COSTS.gemini;
  const openaiCredits = totalOpenaiIterations * CREDIT_COSTS.openai;
  
  return {
    geminiCredits,
    openaiCredits,
    totalCredits: geminiCredits + openaiCredits,
    geminiIterations: totalGeminiIterations,
    openaiIterations: totalOpenaiIterations,
    totalIterations: totalGeminiIterations + totalOpenaiIterations,
  };
}

/**
 * 단일 iteration 크레딧 계산
 */
export function calculateIterationCredit(provider: BatchProvider): number {
  return CREDIT_COSTS[provider];
}

/**
 * 남은 크레딧 계산 (재개 시)
 */
export function calculateRemainingCredits(
  totalIterations: number,
  completedIterations: number,
  geminiTotal: number,
  geminiCompleted: number,
  openaiTotal: number,
  openaiCompleted: number
): number {
  const remainingGemini = geminiTotal - geminiCompleted;
  const remainingOpenai = openaiTotal - openaiCompleted;
  
  return (remainingGemini * CREDIT_COSTS.gemini) + (remainingOpenai * CREDIT_COSTS.openai);
}

// ============================================
// 시간 계산
// ============================================

export interface DurationEstimate {
  minDurationMs: number;
  maxDurationMs: number;
  avgDurationMs: number;
  formattedMin: string;
  formattedMax: string;
  formattedAvg: string;
}

/**
 * 예상 소요 시간 계산
 * 
 * @param totalIterations - 총 iteration 수
 * @param parallelism - 동시 처리 수 (기본 5)
 * @param avgResponseTimeMs - 평균 응답 시간 (기본 3000ms)
 */
export function calculateEstimatedDuration(
  totalIterations: number,
  parallelism: number = 5,
  avgResponseTimeMs: number = 3000
): DurationEstimate {
  // 병렬 처리 배치 수
  const parallelBatches = Math.ceil(totalIterations / parallelism);
  
  // 각 배치 사이 딜레이 (rate limit 방지)
  const delayBetweenBatches = 1000; // 1초
  
  const avgDurationMs = (parallelBatches * avgResponseTimeMs) + ((parallelBatches - 1) * delayBetweenBatches);
  
  return {
    minDurationMs: Math.floor(avgDurationMs * 0.7),
    maxDurationMs: Math.ceil(avgDurationMs * 1.5),
    avgDurationMs,
    formattedMin: formatDuration(avgDurationMs * 0.7),
    formattedMax: formatDuration(avgDurationMs * 1.5),
    formattedAvg: formatDuration(avgDurationMs),
  };
}

/**
 * 질문별 상세 시간 계산
 */
export function calculateDetailedDuration(
  questionCount: number,
  geminiIterations: number,
  openaiIterations: number,
  parallelism: number = 5
): DurationEstimate {
  const totalIterations = questionCount * (geminiIterations + openaiIterations);
  
  // 프로바이더별 가중 평균 응답 시간
  const totalGemini = questionCount * geminiIterations;
  const totalOpenai = questionCount * openaiIterations;
  const weightedAvgTime = (
    (totalGemini * AVG_RESPONSE_TIME.gemini) + 
    (totalOpenai * AVG_RESPONSE_TIME.openai)
  ) / totalIterations;
  
  return calculateEstimatedDuration(totalIterations, parallelism, weightedAvgTime);
}

// ============================================
// 포맷팅 유틸리티
// ============================================

/**
 * 밀리초를 읽기 쉬운 형식으로 변환
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours > 0) {
    if (remainingMinutes === 0) return `${hours}시간`;
    return `${hours}시간 ${remainingMinutes}분`;
  }
  
  if (minutes === 0) return `${seconds}초`;
  if (seconds === 0) return `${minutes}분`;
  return `${minutes}분 ${seconds}초`;
}

/**
 * 크레딧을 읽기 쉬운 형식으로 변환
 */
export function formatCredits(credits: number): string {
  if (credits >= 10000) {
    return `${(credits / 10000).toFixed(1)}만`;
  }
  if (credits >= 1000) {
    return `${(credits / 1000).toFixed(1)}천`;
  }
  return credits.toLocaleString();
}

/**
 * 퍼센트 포맷
 */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return `${value.toFixed(1)}%`;
}

/**
 * 진행률 계산
 */
export function calculateProgress(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100 * 10) / 10;
}

// ============================================
// 검증 유틸리티
// ============================================

/**
 * 크레딧 충분 여부 확인
 */
export function hasEnoughCredits(
  userCredits: number,
  requiredCredits: number
): boolean {
  return userCredits >= requiredCredits;
}

/**
 * iteration 설정 유효성 검증
 */
export function validateIterationSettings(
  geminiIterations: number,
  openaiIterations: number
): { valid: boolean; error?: string } {
  if (geminiIterations < 1 || geminiIterations > 100) {
    return { valid: false, error: 'Gemini 반복 횟수는 1-100 사이여야 합니다.' };
  }
  if (openaiIterations < 1 || openaiIterations > 100) {
    return { valid: false, error: 'OpenAI 반복 횟수는 1-100 사이여야 합니다.' };
  }
  return { valid: true };
}

/**
 * 타임아웃 설정 유효성 검증 (ms)
 */
export function validateTimeoutSetting(timeoutMs: number): { valid: boolean; error?: string } {
  if (timeoutMs < 5000) {
    return { valid: false, error: '타임아웃은 최소 5초 이상이어야 합니다.' };
  }
  if (timeoutMs > 120000) {
    return { valid: false, error: '타임아웃은 최대 2분까지 설정 가능합니다.' };
  }
  return { valid: true };
}

// ============================================
// 비용 예측 (향후 과금 시스템용)
// ============================================

export interface CostBreakdown {
  geminiCost: number;
  openaiCost: number;
  totalCost: number;
  currency: 'KRW' | 'USD';
}

// 크레딧당 예상 비용 (KRW)
const CREDIT_TO_KRW = 10; // 1크레딧 = 10원

/**
 * 예상 비용 계산 (KRW)
 */
export function calculateEstimatedCost(totalCredits: number): CostBreakdown {
  return {
    geminiCost: 0, // 향후 구현
    openaiCost: 0, // 향후 구현
    totalCost: totalCredits * CREDIT_TO_KRW,
    currency: 'KRW',
  };
}
