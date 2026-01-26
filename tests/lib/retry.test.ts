import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry, isRetryableError, llmRetryOptions } from '@/lib/retry';

describe('Retry Logic', () => {
  describe('withRetry', () => {
    it('should return result on success', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const result = await withRetry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success');

      const result = await withRetry(fn, { maxRetries: 3, baseDelay: 10 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries exceeded', async () => {
      const error = new Error('persistent failure');
      const fn = vi.fn().mockRejectedValue(error);

      await expect(
        withRetry(fn, { maxRetries: 2, baseDelay: 10 })
      ).rejects.toThrow('persistent failure');

      expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('should respect shouldRetry option', async () => {
      const nonRetryableError = new Error('do not retry');
      const fn = vi.fn().mockRejectedValue(nonRetryableError);

      await expect(
        withRetry(fn, {
          maxRetries: 3,
          baseDelay: 10,
          shouldRetry: () => false,
        })
      ).rejects.toThrow('do not retry');

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should call onRetry callback', async () => {
      const onRetry = vi.fn();
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success');

      await withRetry(fn, {
        maxRetries: 3,
        baseDelay: 10,
        onRetry,
      });

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(
        expect.any(Error),
        0,
        expect.any(Number)
      );
    });

    it('should apply exponential backoff', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValueOnce('success');

      const delays: number[] = [];
      await withRetry(fn, {
        maxRetries: 3,
        baseDelay: 100,
        onRetry: (_, __, delay) => delays.push(delay),
      });

      // First delay should be around 100ms (+ jitter up to 30%)
      // Second delay should be around 200ms (+ jitter up to 30%)
      expect(delays[0]).toBeGreaterThanOrEqual(100);
      expect(delays[0]).toBeLessThan(150);
      expect(delays[1]).toBeGreaterThanOrEqual(200);
      expect(delays[1]).toBeLessThan(300);
    });

    it('should respect maxDelay', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'));

      const delays: number[] = [];

      await expect(
        withRetry(fn, {
          maxRetries: 3,
          baseDelay: 100,
          maxDelay: 150,
          onRetry: (_, __, delay) => delays.push(delay),
        })
      ).rejects.toThrow('fail');

      // All delays should be capped at maxDelay
      delays.forEach((delay) => {
        expect(delay).toBeLessThanOrEqual(150);
      });
    });
  });

  describe('isRetryableError', () => {
    it('should return true for rate limit errors', () => {
      expect(isRetryableError(new Error('rate limit exceeded'))).toBe(true);
      expect(isRetryableError(new Error('Error 429: Too many requests'))).toBe(
        true
      );
    });

    it('should return true for timeout errors', () => {
      expect(isRetryableError(new Error('Request timeout'))).toBe(true);
      expect(isRetryableError(new Error('Operation timed out'))).toBe(true);
    });

    it('should return true for network errors', () => {
      expect(isRetryableError(new Error('Network error'))).toBe(true);
      expect(isRetryableError(new Error('ECONNRESET'))).toBe(true);
    });

    it('should return true for server errors', () => {
      expect(isRetryableError(new Error('500 Internal Server Error'))).toBe(
        true
      );
      expect(isRetryableError(new Error('502 Bad Gateway'))).toBe(true);
      expect(isRetryableError(new Error('503 Service Unavailable'))).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      expect(isRetryableError(new Error('Invalid API key'))).toBe(false);
      expect(isRetryableError(new Error('400 Bad Request'))).toBe(false);
      expect(isRetryableError(new Error('Authentication failed'))).toBe(false);
    });

    it('should return false for non-Error values', () => {
      expect(isRetryableError('string error')).toBe(false);
      expect(isRetryableError(null)).toBe(false);
      expect(isRetryableError(undefined)).toBe(false);
      expect(isRetryableError({ message: 'object error' })).toBe(false);
    });
  });

  describe('llmRetryOptions', () => {
    it('should return correct configuration for provider', () => {
      const options = llmRetryOptions('openai');

      expect(options.maxRetries).toBe(3);
      expect(options.baseDelay).toBe(1000);
      expect(options.maxDelay).toBe(10000);
      expect(options.shouldRetry).toBe(isRetryableError);
      expect(options.onRetry).toBeDefined();
    });

    it('should use isRetryableError for shouldRetry', () => {
      const options = llmRetryOptions('claude');

      expect(options.shouldRetry!(new Error('rate limit'), 0)).toBe(true);
      expect(options.shouldRetry!(new Error('invalid key'), 0)).toBe(false);
    });
  });
});
