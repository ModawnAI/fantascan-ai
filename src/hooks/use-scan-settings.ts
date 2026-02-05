'use client';

import useSWR, { mutate } from 'swr';
import useSWRMutation from 'swr/mutation';
import { fetcher } from '@/lib/swr';
import type { UserScanSettings, UserScanSettingsInput } from '@/types/batch-scan';
import type { Brand } from '@/types/database';
import { useCallback } from 'react';

// ============================================
// API Endpoints
// ============================================

const API = {
  scanSettings: '/api/settings/scan',
};

// ============================================
// Response Types
// ============================================

interface ScanSettingsResponse {
  settings: UserScanSettings;
  defaultBrand: Brand | null;
}

// ============================================
// Hooks: 스캔 설정 조회
// ============================================

export function useScanSettings() {
  const { data, error, isLoading, isValidating } = useSWR<ScanSettingsResponse>(
    API.scanSettings,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  return {
    settings: data?.settings ?? null,
    defaultBrand: data?.defaultBrand ?? null,
    isLoading,
    isValidating,
    error,
    mutate: () => mutate(API.scanSettings),
  };
}

// ============================================
// Hooks: 스캔 설정 수정
// ============================================

export function useUpdateScanSettings() {
  const { trigger, isMutating, error, data, reset } = useSWRMutation<
    { settings: UserScanSettings },
    Error,
    string,
    UserScanSettingsInput
  >(API.scanSettings, (url, { arg }) =>
    fetcher(url, { method: 'PATCH', body: JSON.stringify(arg) })
  );

  const updateSettings = useCallback(
    async (input: UserScanSettingsInput) => {
      const result = await trigger(input);

      // Revalidate
      await mutate(API.scanSettings);

      return result;
    },
    [trigger]
  );

  return {
    updateSettings,
    isUpdating: isMutating,
    error,
    data,
    reset,
  };
}

// ============================================
// Export
// ============================================

export { API as SCAN_SETTINGS_API };
