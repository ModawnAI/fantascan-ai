'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import type { TrendPeriod, TrendData, ContentRecommendation, Citation, Alert, AlertConfig } from '@/types/database';

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
});

// ============================================
// Trends Hook
// ============================================

interface TrendsData {
  overall: TrendData;
  providers: Record<string, TrendData>;
  competitors: Record<string, { current: number; previous: number; change: number }>;
}

export function useTrends(brandId: string | null, period: TrendPeriod = '7d') {
  const { data, error, isLoading, mutate } = useSWR<TrendsData>(
    brandId ? `/api/analytics/trends?brandId=${brandId}&period=${period}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute
    }
  );

  return {
    trends: data,
    isLoading,
    error,
    mutate,
  };
}

// ============================================
// Share of Voice Hook
// ============================================

interface SOVEntity {
  name: string;
  percentage: number;
  mentionsCount: number;
  visibilityScore?: number;
  averagePosition?: number;
  sentiment?: {
    positive: number;
    neutral: number;
    negative: number;
  };
  isBrand: boolean;
}

interface SOVData {
  brand: SOVEntity;
  competitors: SOVEntity[];
  total: {
    entities: number;
    mentions: number;
  };
  history: Array<{
    recorded_at: string;
    competitor_sov: Record<string, number>;
  }>;
}

export function useShareOfVoice(brandId: string | null, scanId?: string) {
  const url = brandId 
    ? `/api/analytics/sov?brandId=${brandId}${scanId ? `&scanId=${scanId}` : ''}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<SOVData>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  return {
    sov: data,
    isLoading,
    error,
    mutate,
  };
}

// ============================================
// Citations Hook
// ============================================

interface CitationsData {
  citations: Citation[];
  summary: {
    total: number;
    topDomains: Array<{ domain: string; count: number }>;
    byProvider: Array<{ provider: string; count: number }>;
  };
}

export function useCitations(brandId: string | null, options?: { scanId?: string; limit?: number }) {
  const params = new URLSearchParams();
  if (brandId) params.set('brandId', brandId);
  if (options?.scanId) params.set('scanId', options.scanId);
  if (options?.limit) params.set('limit', options.limit.toString());

  const { data, error, isLoading, mutate } = useSWR<CitationsData>(
    brandId ? `/api/analytics/citations?${params.toString()}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  return {
    citations: data?.citations || [],
    summary: data?.summary,
    isLoading,
    error,
    mutate,
  };
}

// ============================================
// Recommendations Hook
// ============================================

interface RecommendationsData {
  recommendations: ContentRecommendation[];
  summary: {
    total: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
  };
}

export function useRecommendations(brandId: string | null, options?: { status?: string; limit?: number }) {
  const params = new URLSearchParams();
  if (brandId) params.set('brandId', brandId);
  if (options?.status) params.set('status', options.status);
  if (options?.limit) params.set('limit', options.limit.toString());

  const { data, error, isLoading, mutate } = useSWR<RecommendationsData>(
    brandId ? `/api/analytics/recommendations?${params.toString()}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  const updateStatus = useCallback(async (id: string, status: string) => {
    try {
      const response = await fetch('/api/analytics/recommendations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      
      if (!response.ok) throw new Error('Failed to update');
      
      mutate();
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }, [mutate]);

  return {
    recommendations: data?.recommendations || [],
    summary: data?.summary,
    isLoading,
    error,
    updateStatus,
    mutate,
  };
}

// ============================================
// Alerts Hook
// ============================================

interface AlertsData {
  alerts: Alert[];
  unreadCount: number;
}

export function useAlerts(options?: { brandId?: string; unreadOnly?: boolean; limit?: number }) {
  const params = new URLSearchParams();
  if (options?.brandId) params.set('brandId', options.brandId);
  if (options?.unreadOnly) params.set('unreadOnly', 'true');
  if (options?.limit) params.set('limit', options.limit.toString());

  const { data, error, isLoading, mutate } = useSWR<AlertsData>(
    `/api/alerts?${params.toString()}`,
    fetcher,
    {
      revalidateOnFocus: true,
      refreshInterval: 60000, // Check for new alerts every minute
    }
  );

  const markAsRead = useCallback(async (alertIds?: string[]) => {
    try {
      const response = await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertIds ? { alertIds } : { markAllRead: true }),
      });
      
      if (!response.ok) throw new Error('Failed to update');
      
      mutate();
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }, [mutate]);

  return {
    alerts: data?.alerts || [],
    unreadCount: data?.unreadCount || 0,
    isLoading,
    error,
    markAsRead,
    mutate,
  };
}

// ============================================
// Alert Config Hook
// ============================================

interface AlertConfigsData {
  configs: AlertConfig[];
}

export function useAlertConfigs(brandId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<AlertConfigsData>(
    brandId ? `/api/alerts/config?brandId=${brandId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  const updateConfig = useCallback(async (id: string, updates: Partial<AlertConfig>) => {
    try {
      const response = await fetch('/api/alerts/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      
      if (!response.ok) throw new Error('Failed to update');
      
      mutate();
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }, [mutate]);

  const createConfig = useCallback(async (config: Partial<AlertConfig> & { brandId: string }) => {
    try {
      const response = await fetch('/api/alerts/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      
      if (!response.ok) throw new Error('Failed to create');
      
      mutate();
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }, [mutate]);

  return {
    configs: data?.configs || [],
    isLoading,
    error,
    updateConfig,
    createConfig,
    mutate,
  };
}
