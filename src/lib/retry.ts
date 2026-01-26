// Retry logic with exponential backoff for Fantascan AI

import { logger } from './logger';

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number, delay: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  shouldRetry: () => true,
  onRetry: () => {},
};

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function calculateDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  // Exponential backoff with jitter
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay; // 0-30% jitter
  return Math.min(exponentialDelay + jitter, maxDelay);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === opts.maxRetries) {
        break;
      }

      if (!opts.shouldRetry(error, attempt)) {
        break;
      }

      const delay = calculateDelay(attempt, opts.baseDelay, opts.maxDelay);

      logger.debug('Retrying operation', {
        attempt: attempt + 1,
        maxRetries: opts.maxRetries,
        delay,
        error: error instanceof Error ? error.message : String(error),
      });

      opts.onRetry(error, attempt, delay);

      await sleep(delay);
    }
  }

  throw lastError;
}

// Helper to determine if error is retryable
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Rate limit errors
    if (message.includes('rate limit') || message.includes('429')) {
      return true;
    }

    // Timeout errors
    if (message.includes('timeout') || message.includes('timed out')) {
      return true;
    }

    // Network errors
    if (message.includes('network') || message.includes('econnreset')) {
      return true;
    }

    // Server errors (5xx)
    if (message.includes('500') || message.includes('502') || message.includes('503')) {
      return true;
    }
  }

  return false;
}

// Specific retry configuration for LLM providers
export function llmRetryOptions(provider: string): RetryOptions {
  return {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    shouldRetry: isRetryableError,
    onRetry: (error, attempt, delay) => {
      logger.warn(`LLM provider retry`, {
        provider,
        attempt: attempt + 1,
        delay,
        error: error instanceof Error ? error.message : String(error),
      });
    },
  };
}
