'use client';

import useSWR, { mutate } from 'swr';
import useSWRMutation from 'swr/mutation';
import { fetcher, postFetcher, getPaginatedKey } from '@/lib/swr';
import type {
  BatchScan,
  BatchScanWithDetails,
  BatchScanStatus,
  BatchScanQuestion,
  BatchScanIteration,
  CreateBatchScanInput,
  BatchScansResponse,
} from '@/types/batch-scan';
import { useCallback } from 'react';

// ============================================
// API Endpoints
// ============================================

const API = {
  batchScans: '/api/batch-scans',
  batchScan: (id: string) => `/api/batch-scans/${id}`,
  batchScanIterations: (id: string, questionId: string) =>
    `/api/batch-scans/${id}/iterations?questionId=${questionId}`,
};

// ============================================
// Response Types
// ============================================

interface BatchScanDetailResponse {
  batchScan: BatchScanWithDetails & {
    questions: BatchScanQuestion[];
  };
}

// ============================================
// Hooks: 배치 스캔 목록
// ============================================

interface UseBatchScansParams {
  limit?: number;
  offset?: number;
  status?: BatchScanStatus;
}

export function useBatchScans(params: UseBatchScansParams = {}) {
  const key = getPaginatedKey(API.batchScans, {
    limit: params.limit ?? 10,
    offset: params.offset ?? 0,
    status: params.status,
  });

  const { data, error, isLoading, isValidating } = useSWR<BatchScansResponse>(
    key,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  return {
    batchScans: data?.batchScans ?? [],
    pagination: data?.pagination,
    isLoading,
    isValidating,
    error,
    mutate: () => mutate(key),
  };
}

// ============================================
// Hooks: 단일 배치 스캔
// ============================================

export function useBatchScan(id: string | null) {
  const { data, error, isLoading, isValidating, mutate: revalidate } = useSWR<BatchScanDetailResponse>(
    id ? API.batchScan(id) : null,
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: (data) => {
        // 진행 중일 때만 5초마다 갱신
        if (data?.batchScan?.status === 'running') {
          return 5000;
        }
        return 0;
      },
    }
  );

  return {
    batchScan: data?.batchScan,
    questions: data?.batchScan?.questions ?? [],
    isLoading,
    isValidating,
    error,
    mutate: revalidate,
  };
}

// ============================================
// Hooks: 배치 스캔 생성
// ============================================

export function useCreateBatchScan() {
  const { trigger, isMutating, error, data, reset } = useSWRMutation<
    { batchScan: BatchScanWithDetails },
    Error,
    string,
    CreateBatchScanInput
  >(API.batchScans, (url, { arg }) => postFetcher(url, arg));

  const createBatchScan = useCallback(
    async (input: CreateBatchScanInput) => {
      const result = await trigger(input);

      // Revalidate list
      await mutate(
        (key) => typeof key === 'string' && key.startsWith(API.batchScans),
        undefined,
        { revalidate: true }
      );

      return result;
    },
    [trigger]
  );

  return {
    createBatchScan,
    isCreating: isMutating,
    error,
    data,
    reset,
  };
}

// ============================================
// Hooks: 배치 스캔 일시정지
// ============================================

export function usePauseBatchScan(id: string) {
  const { trigger, isMutating, error, reset } = useSWRMutation(
    API.batchScan(id),
    (url) =>
      fetcher(url, {
        method: 'POST',
        body: JSON.stringify({ action: 'pause' }),
      })
  );

  const pauseScan = useCallback(async () => {
    await trigger();
    await mutate(API.batchScan(id));
  }, [trigger, id]);

  return {
    pauseScan,
    isPausing: isMutating,
    error,
    reset,
  };
}

// ============================================
// Hooks: 배치 스캔 재개
// ============================================

export function useResumeBatchScan(id: string) {
  const { trigger, isMutating, error, reset } = useSWRMutation(
    API.batchScan(id),
    (url) =>
      fetcher(url, {
        method: 'POST',
        body: JSON.stringify({ action: 'resume' }),
      })
  );

  const resumeScan = useCallback(async () => {
    await trigger();
    await mutate(API.batchScan(id));
  }, [trigger, id]);

  return {
    resumeScan,
    isResuming: isMutating,
    error,
    reset,
  };
}

// ============================================
// Hooks: 배치 스캔 삭제
// ============================================

export function useDeleteBatchScan(id: string) {
  const { trigger, isMutating, error, reset } = useSWRMutation(
    API.batchScan(id),
    (url) => fetcher(url, { method: 'DELETE' })
  );

  const deleteScan = useCallback(async () => {
    await trigger();

    // Revalidate list
    await mutate(
      (key) => typeof key === 'string' && key.startsWith(API.batchScans),
      undefined,
      { revalidate: true }
    );
  }, [trigger]);

  return {
    deleteScan,
    isDeleting: isMutating,
    error,
    reset,
  };
}

// ============================================
// Hooks: 질문별 개별 LLM 응답 조회
// ============================================

interface BatchScanIterationsResponse {
  iterations: BatchScanIteration[];
}

export function useBatchScanIterations(batchScanId: string, questionId: string | null) {
  const { data, error, isLoading } = useSWR<BatchScanIterationsResponse>(
    questionId ? API.batchScanIterations(batchScanId, questionId) : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    iterations: data?.iterations ?? [],
    isLoading,
    error,
  };
}

// ============================================
// Export
// ============================================

export { API as BATCH_SCAN_API };
