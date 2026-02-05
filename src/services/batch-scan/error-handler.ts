/**
 * 배치 스캔 에러 핸들러
 * 에러 분류 및 복구 로직
 */

import type { PauseReason } from '@/types/batch-scan';

// ============================================
// Types
// ============================================

export type ErrorType =
  | 'RATE_LIMIT'
  | 'TIMEOUT'
  | 'NETWORK'
  | 'AUTH'
  | 'SERVER'
  | 'PARSE'
  | 'CREDIT'
  | 'UNKNOWN';

export type ErrorAction = 'retry' | 'skip' | 'pause' | 'fail';

export interface ErrorClassification {
  type: ErrorType;
  action: ErrorAction;
  retryDelayMs?: number;
  maxRetries?: number;
  pauseReason?: PauseReason;
  message: string;
  userMessage: string;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

// ============================================
// Default Configurations
// ============================================

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
};

// ============================================
// Error Classification
// ============================================

/**
 * 에러를 분류하고 적절한 액션을 결정
 */
export function classifyError(error: Error | unknown): ErrorClassification {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const originalMessage = error instanceof Error ? error.message : String(error);

  // Rate Limit (429)
  if (
    message.includes('429') ||
    message.includes('rate limit') ||
    message.includes('quota') ||
    message.includes('too many requests')
  ) {
    return {
      type: 'RATE_LIMIT',
      action: 'retry',
      retryDelayMs: 60000, // 1분 대기
      maxRetries: 5,
      pauseReason: 'rate_limit',
      message: originalMessage,
      userMessage: 'API 요청 한도에 도달했습니다. 잠시 후 자동으로 재시도합니다.',
    };
  }

  // Timeout
  if (
    message.includes('timeout') ||
    message.includes('aborted') ||
    message.includes('timed out') ||
    message.includes('econnreset')
  ) {
    return {
      type: 'TIMEOUT',
      action: 'skip',
      message: originalMessage,
      userMessage: 'API 응답 시간이 초과되었습니다. 다음 항목으로 진행합니다.',
    };
  }

  // Network
  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('enotfound') ||
    message.includes('socket') ||
    message.includes('connection')
  ) {
    return {
      type: 'NETWORK',
      action: 'retry',
      retryDelayMs: 30000, // 30초 대기
      maxRetries: 3,
      pauseReason: 'network_error',
      message: originalMessage,
      userMessage: '네트워크 오류가 발생했습니다. 연결 상태를 확인하고 재시도합니다.',
    };
  }

  // Auth (401, 403)
  if (
    message.includes('401') ||
    message.includes('403') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('api key') ||
    message.includes('invalid key')
  ) {
    return {
      type: 'AUTH',
      action: 'fail',
      pauseReason: 'auth_error',
      message: originalMessage,
      userMessage: 'API 인증에 실패했습니다. 설정을 확인해주세요.',
    };
  }

  // Server Error (5xx)
  if (
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('504') ||
    message.includes('internal server') ||
    message.includes('bad gateway') ||
    message.includes('service unavailable')
  ) {
    return {
      type: 'SERVER',
      action: 'retry',
      retryDelayMs: 10000, // 10초 대기
      maxRetries: 3,
      message: originalMessage,
      userMessage: 'AI 서비스에 일시적인 오류가 발생했습니다. 잠시 후 재시도합니다.',
    };
  }

  // Parse Error
  if (
    message.includes('json') ||
    message.includes('parse') ||
    message.includes('syntax') ||
    message.includes('unexpected token')
  ) {
    return {
      type: 'PARSE',
      action: 'skip',
      message: originalMessage,
      userMessage: '응답 처리 중 오류가 발생했습니다. 다음 항목으로 진행합니다.',
    };
  }

  // Credit
  if (
    message.includes('credit') ||
    message.includes('insufficient') ||
    message.includes('balance')
  ) {
    return {
      type: 'CREDIT',
      action: 'pause',
      pauseReason: 'insufficient_credits',
      message: originalMessage,
      userMessage: '크레딧이 부족합니다. 충전 후 재개해주세요.',
    };
  }

  // Unknown
  return {
    type: 'UNKNOWN',
    action: 'skip',
    message: originalMessage,
    userMessage: `예상치 못한 오류가 발생했습니다: ${originalMessage.substring(0, 100)}`,
  };
}

// ============================================
// Retry Logic
// ============================================

/**
 * 지수 백오프 딜레이 계산
 */
export function calculateBackoffDelay(
  retryCount: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const delay = config.baseDelayMs * Math.pow(config.backoffMultiplier, retryCount);
  // 약간의 지터(랜덤)를 추가하여 thundering herd 방지
  const jitter = Math.random() * 0.2 * delay;
  return Math.min(delay + jitter, config.maxDelayMs);
}

/**
 * 재시도 가능 여부 확인
 */
export function shouldRetry(
  retryCount: number,
  errorClassification: ErrorClassification,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): boolean {
  if (errorClassification.action !== 'retry') {
    return false;
  }

  const maxRetries = errorClassification.maxRetries || config.maxRetries;
  return retryCount < maxRetries;
}

// ============================================
// Sleep Helper
// ============================================

/**
 * 비동기 대기
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================
// Error Aggregation
// ============================================

export interface ErrorSummary {
  totalErrors: number;
  errorsByType: Record<ErrorType, number>;
  criticalErrors: number;
  recoverableErrors: number;
}

/**
 * 에러 요약 생성
 */
export function summarizeErrors(errors: ErrorClassification[]): ErrorSummary {
  const summary: ErrorSummary = {
    totalErrors: errors.length,
    errorsByType: {} as Record<ErrorType, number>,
    criticalErrors: 0,
    recoverableErrors: 0,
  };

  for (const error of errors) {
    summary.errorsByType[error.type] = (summary.errorsByType[error.type] || 0) + 1;

    if (error.action === 'fail' || error.action === 'pause') {
      summary.criticalErrors++;
    } else {
      summary.recoverableErrors++;
    }
  }

  return summary;
}

// ============================================
// Circuit Breaker
// ============================================

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

const circuitBreakers: Map<string, CircuitBreakerState> = new Map();

const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5,
  resetTimeMs: 60000, // 1분 후 리셋
};

/**
 * 서킷 브레이커 상태 확인
 */
export function isCircuitOpen(key: string): boolean {
  const state = circuitBreakers.get(key);
  if (!state) return false;

  if (state.isOpen) {
    // 리셋 시간이 지났는지 확인
    if (Date.now() - state.lastFailure > CIRCUIT_BREAKER_CONFIG.resetTimeMs) {
      // Half-open 상태로 전환
      state.isOpen = false;
      state.failures = 0;
      return false;
    }
    return true;
  }

  return false;
}

/**
 * 서킷 브레이커에 실패 기록
 */
export function recordCircuitFailure(key: string): void {
  let state = circuitBreakers.get(key);
  if (!state) {
    state = { failures: 0, lastFailure: 0, isOpen: false };
    circuitBreakers.set(key, state);
  }

  state.failures++;
  state.lastFailure = Date.now();

  if (state.failures >= CIRCUIT_BREAKER_CONFIG.failureThreshold) {
    state.isOpen = true;
  }
}

/**
 * 서킷 브레이커에 성공 기록 (리셋)
 */
export function recordCircuitSuccess(key: string): void {
  const state = circuitBreakers.get(key);
  if (state) {
    state.failures = 0;
    state.isOpen = false;
  }
}

// Types are exported at the top of the file
