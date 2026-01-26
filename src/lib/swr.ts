/**
 * SWR Configuration and Utilities
 *
 * Provides a centralized caching layer using SWR for data fetching.
 */

import { SWRConfiguration } from 'swr';

/**
 * Base fetcher function for SWR
 * Handles JSON responses and error cases
 */
export async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = new Error('API request failed');
    const data = await res.json().catch(() => ({}));
    (error as Error & { info?: unknown; status?: number }).info = data;
    (error as Error & { info?: unknown; status?: number }).status = res.status;
    throw error;
  }

  return res.json();
}

/**
 * POST request fetcher for mutations
 */
export async function postFetcher<T, B = unknown>(
  url: string,
  body: B
): Promise<T> {
  return fetcher<T>(url, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Default SWR configuration
 */
export const swrConfig: SWRConfiguration = {
  fetcher,
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 5000, // 5 seconds deduplication window
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  shouldRetryOnError: true,
  onError: (error, key) => {
    console.error(`SWR error for ${key}:`, error);
  },
};

/**
 * Configuration for real-time data that needs frequent updates
 */
export const realtimeConfig: SWRConfiguration = {
  ...swrConfig,
  refreshInterval: 30000, // 30 seconds
  revalidateOnFocus: true,
};

/**
 * Configuration for static data that rarely changes
 */
export const staticConfig: SWRConfiguration = {
  ...swrConfig,
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 60000, // 1 minute
};

/**
 * Generate a cache key for paginated lists
 */
export function getPaginatedKey<T extends Record<string, unknown>>(
  base: string,
  params: T
): string {
  const filtered = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${String(v)}`)
    .join('&');
  return filtered ? `${base}?${filtered}` : base;
}

/**
 * API endpoints
 */
export const API = {
  brands: '/api/brands',
  brand: (id: string) => `/api/brands/${id}`,
  scans: '/api/scans',
  scan: (id: string) => `/api/scans/${id}`,
  user: '/api/user',
  health: '/api/health',
} as const;

/**
 * Cache keys for SWR
 */
export const CACHE_KEYS = {
  brands: 'brands',
  scans: 'scans',
  user: 'user',
  scan: (id: string) => `scan-${id}`,
  brand: (id: string) => `brand-${id}`,
} as const;
