// In-memory rate limiting for Fantascan AI
// For production, consider using Upstash Redis

import { RateLimitError } from './errors';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (resets on server restart)
const store = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}, 60000); // Clean up every minute

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  // If no entry or expired, create new one
  if (!entry || entry.resetAt < now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    store.set(key, newEntry);

    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetAt: newEntry.resetAt,
    };
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  // Increment counter
  entry.count++;

  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

// Middleware helper for API routes
export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): { success: true } | never {
  const result = checkRateLimit(identifier, config);

  if (!result.success) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    throw new RateLimitError(retryAfter);
  }

  return { success: true };
}

// Pre-configured rate limiters
export const rateLimiters = {
  scan: (userId: string) =>
    rateLimit(`scan:${userId}`, {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10,
    }),

  brand: (userId: string) =>
    rateLimit(`brand:${userId}`, {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 20,
    }),

  api: (ip: string) =>
    rateLimit(`api:${ip}`, {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
    }),

  auth: (ip: string) =>
    rateLimit(`auth:${ip}`, {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 10,
    }),
};
