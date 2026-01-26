'use client';

import useSWR, { mutate } from 'swr';
import useSWRMutation from 'swr/mutation';
import { API, fetcher, postFetcher, getPaginatedKey } from '@/lib/swr';
import type { Scan, ScanStatus } from '@/types/database';
import { useCallback } from 'react';

interface ScansResponse {
  scans: Scan[];
  pagination: {
    limit: number;
    offset: number;
    total: number | null;
  };
}

interface ScanParams {
  limit?: number;
  offset?: number;
  brandId?: string;
  status?: ScanStatus;
  [key: string]: string | number | undefined;
}

interface CreateScanInput {
  brandId: string;
  providers?: string[];
}

/**
 * Hook for fetching all scans with pagination and filtering
 */
export function useScans(params: ScanParams = {}) {
  const key = getPaginatedKey(API.scans, params);

  const { data, error, isLoading, isValidating } = useSWR<ScansResponse>(
    key,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  );

  return {
    scans: data?.scans ?? [],
    pagination: data?.pagination,
    isLoading,
    isValidating,
    error,
    mutate: () => mutate(key),
  };
}

/**
 * Hook for fetching a single scan with results
 */
export function useScan(id: string | null) {
  const { data, error, isLoading, isValidating } = useSWR<{ scan: Scan }>(
    id ? API.scan(id) : null,
    fetcher,
    {
      // Refresh more frequently for in-progress scans
      refreshInterval: (data) => {
        if (data?.scan?.status === 'processing') return 5000;
        if (data?.scan?.status === 'pending') return 10000;
        return 0;
      },
    }
  );

  return {
    scan: data?.scan,
    isLoading,
    isValidating,
    error,
    mutate: () => id && mutate(API.scan(id)),
  };
}

/**
 * Hook for creating a new scan with optimistic updates
 */
export function useCreateScan() {
  const { trigger, isMutating, error, data, reset } = useSWRMutation<
    { scan: Scan },
    Error,
    string,
    CreateScanInput
  >(API.scans, (url, { arg }) => postFetcher(url, arg));

  const createScan = useCallback(
    async (input: CreateScanInput) => {
      // Create optimistic scan
      const optimisticScan: Scan = {
        id: `temp-${Date.now()}`,
        user_id: '',
        brand_id: input.brandId,
        scan_type: 'single',
        status: 'pending' as ScanStatus,
        visibility_score: null,
        ai_visibility_score: null,
        seo_visibility_score: null,
        mentions_count: 0,
        total_providers: input.providers?.length ?? 0,
        credits_used: 0,
        error_message: null,
        completed_at: null,
        created_at: new Date().toISOString(),
      };

      const scansListKey = API.scans;

      // Optimistically add to list caches
      await mutate(
        (key) => typeof key === 'string' && key.startsWith(scansListKey),
        (current: ScansResponse | undefined) => {
          if (!current) return current;
          return {
            ...current,
            scans: [optimisticScan, ...current.scans],
            pagination: {
              ...current.pagination,
              total: current.pagination.total ? current.pagination.total + 1 : 1,
            },
          };
        },
        { revalidate: false }
      );

      try {
        const result = await trigger(input);

        // Replace optimistic scan with real data
        await mutate(
          (key) => typeof key === 'string' && key.startsWith(scansListKey),
          (current: ScansResponse | undefined) => {
            if (!current) return current;
            return {
              ...current,
              scans: current.scans.map((s) =>
                s.id === optimisticScan.id ? result?.scan ?? s : s
              ),
            };
          },
          { revalidate: true }
        );

        return result;
      } catch (err) {
        // Rollback on error
        await mutate(
          (key) => typeof key === 'string' && key.startsWith(scansListKey),
          (current: ScansResponse | undefined) => {
            if (!current) return current;
            return {
              ...current,
              scans: current.scans.filter((s) => s.id !== optimisticScan.id),
              pagination: {
                ...current.pagination,
                total: current.pagination.total ? current.pagination.total - 1 : 0,
              },
            };
          },
          { revalidate: true }
        );
        throw err;
      }
    },
    [trigger]
  );

  return {
    createScan,
    isCreating: isMutating,
    error,
    data,
    reset,
  };
}

/**
 * Hook for polling scan status
 */
export function useScanPolling(id: string | null, enabled: boolean = true) {
  const { data, error, isLoading } = useSWR<{ scan: Scan }>(
    id && enabled ? API.scan(id) : null,
    fetcher,
    {
      refreshInterval: 3000,
      revalidateOnFocus: false,
    }
  );

  const isComplete = data?.scan?.status === 'completed' || data?.scan?.status === 'failed';

  return {
    scan: data?.scan,
    isLoading,
    error,
    isComplete,
    isRunning: data?.scan?.status === 'processing',
  };
}

/**
 * Hook for deleting a scan with optimistic updates
 */
export function useDeleteScan(id: string) {
  const { trigger, isMutating, error, reset } = useSWRMutation(
    API.scan(id),
    (url) => fetcher(url, { method: 'DELETE' })
  );

  const deleteScan = useCallback(async () => {
    const scansListKey = API.scans;

    // Store deleted scan for rollback
    let deletedScan: Scan | undefined;
    let deletedIndex = -1;

    // Optimistically remove from list caches
    await mutate(
      (key) => typeof key === 'string' && key.startsWith(scansListKey),
      (current: ScansResponse | undefined) => {
        if (!current) return current;
        const index = current.scans.findIndex((s) => s.id === id);
        if (index !== -1) {
          deletedScan = current.scans[index];
          deletedIndex = index;
        }
        return {
          ...current,
          scans: current.scans.filter((s) => s.id !== id),
          pagination: {
            ...current.pagination,
            total: current.pagination.total ? current.pagination.total - 1 : 0,
          },
        };
      },
      { revalidate: false }
    );

    try {
      await trigger();
      // Clear single scan cache
      await mutate(API.scan(id), undefined, { revalidate: false });
    } catch (err) {
      // Rollback on error - restore deleted scan
      if (deletedScan) {
        await mutate(
          (key) => typeof key === 'string' && key.startsWith(scansListKey),
          (current: ScansResponse | undefined) => {
            if (!current) return current;
            const scans = [...current.scans];
            scans.splice(deletedIndex, 0, deletedScan!);
            return {
              ...current,
              scans,
              pagination: {
                ...current.pagination,
                total: current.pagination.total ? current.pagination.total + 1 : 1,
              },
            };
          },
          { revalidate: true }
        );
      }
      throw err;
    }
  }, [id, trigger]);

  return {
    deleteScan,
    isDeleting: isMutating,
    error,
    reset,
  };
}

/**
 * Prefetch scans data
 */
export function prefetchScans(params: ScanParams = {}) {
  const key = getPaginatedKey(API.scans, params);
  return mutate(key, fetcher(key));
}

/**
 * Prefetch a single scan
 */
export function prefetchScan(id: string) {
  return mutate(API.scan(id), fetcher(API.scan(id)));
}
