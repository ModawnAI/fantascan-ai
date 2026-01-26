import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkRateLimit, rateLimit, RateLimitConfig } from '@/lib/rate-limit';
import { RateLimitError } from '@/lib/errors';

// We need to mock the store since it's module-level
// For testing, we'll use unique keys to avoid interference

describe('Rate Limiting', () => {
  const testConfig: RateLimitConfig = {
    windowMs: 60000, // 1 minute
    maxRequests: 5,
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  describe('checkRateLimit', () => {
    it('should allow first request', () => {
      const key = `test-first-${Date.now()}`;
      const result = checkRateLimit(key, testConfig);

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('should track request count correctly', () => {
      const key = `test-count-${Date.now()}`;

      // Make 3 requests
      checkRateLimit(key, testConfig);
      checkRateLimit(key, testConfig);
      const result = checkRateLimit(key, testConfig);

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(2);
    });

    it('should block when limit exceeded', () => {
      const key = `test-exceed-${Date.now()}`;

      // Use up all requests
      for (let i = 0; i < testConfig.maxRequests; i++) {
        checkRateLimit(key, testConfig);
      }

      // Next request should fail
      const result = checkRateLimit(key, testConfig);

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset after window expires', () => {
      const key = `test-reset-${Date.now()}`;

      // Use up all requests
      for (let i = 0; i < testConfig.maxRequests; i++) {
        checkRateLimit(key, testConfig);
      }

      // Verify blocked
      expect(checkRateLimit(key, testConfig).success).toBe(false);

      // Advance time past the window
      vi.advanceTimersByTime(testConfig.windowMs + 1000);

      // Should be allowed again
      const result = checkRateLimit(key, testConfig);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('should return correct resetAt time', () => {
      const key = `test-reset-time-${Date.now()}`;
      const before = Date.now();
      const result = checkRateLimit(key, testConfig);
      const after = Date.now();

      expect(result.resetAt).toBeGreaterThanOrEqual(before + testConfig.windowMs);
      expect(result.resetAt).toBeLessThanOrEqual(after + testConfig.windowMs);
    });
  });

  describe('rateLimit middleware', () => {
    it('should return success when under limit', () => {
      const key = `test-middleware-${Date.now()}`;
      const result = rateLimit(key, testConfig);

      expect(result).toEqual({ success: true });
    });

    it('should throw RateLimitError when limit exceeded', () => {
      const key = `test-middleware-error-${Date.now()}`;

      // Use up all requests
      for (let i = 0; i < testConfig.maxRequests; i++) {
        rateLimit(key, testConfig);
      }

      // Next request should throw
      expect(() => rateLimit(key, testConfig)).toThrow(RateLimitError);
    });

    it('should include retryAfter in error', () => {
      const key = `test-retry-after-${Date.now()}`;

      // Use up all requests
      for (let i = 0; i < testConfig.maxRequests; i++) {
        rateLimit(key, testConfig);
      }

      try {
        rateLimit(key, testConfig);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError);
        expect((error as RateLimitError).details?.retryAfter).toBeGreaterThan(0);
      }
    });
  });

  describe('separate rate limit buckets', () => {
    it('should track different keys independently', () => {
      const key1 = `user-1-${Date.now()}`;
      const key2 = `user-2-${Date.now()}`;

      // Use up key1's requests
      for (let i = 0; i < testConfig.maxRequests; i++) {
        checkRateLimit(key1, testConfig);
      }

      // key1 should be blocked
      expect(checkRateLimit(key1, testConfig).success).toBe(false);

      // key2 should still work
      expect(checkRateLimit(key2, testConfig).success).toBe(true);
    });
  });
});
