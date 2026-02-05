/**
 * Event type definitions for Inngest functions
 */

import type { ProviderType } from '@/types/database';

// New scan request event (from API)
export interface ScanBrandRequestedEvent {
  data: {
    scanId: string;
    brandId: string;
    userId: string;
    query: string;
    providers: ProviderType[];
  };
}

export interface ScanBrandCompletedEvent {
  data: {
    scanId: string;
    brandId: string;
    userId: string;
    overallScore: number;
    timestamp: string;
  };
}

// Legacy events for scheduled scans
export interface BrandScanRequestedEvent {
  data: {
    brandId: string;
    brandName: string;
    keywords: string[];
    userId: string;
    scanType: 'manual' | 'scheduled';
  };
}

export interface BrandScanCompletedEvent {
  data: {
    brandId: string;
    scanId: string;
    results: {
      aeoScore: number;
      geoScore: number;
      seoScore: number;
      overallScore: number;
    };
    timestamp: string;
  };
}

export interface SearchAnalyzeRequestedEvent {
  data: {
    brandId: string;
    query: string;
    provider: ProviderType;
  };
}

export interface ReportGenerateRequestedEvent {
  data: {
    brandId: string;
    userId: string;
    reportType: 'daily' | 'weekly' | 'monthly';
    dateRange: {
      start: string;
      end: string;
    };
  };
}

export interface AlertVisibilityChangedEvent {
  data: {
    brandId: string;
    userId: string;
    previousScore: number;
    currentScore: number;
    changePercent: number;
  };
}

// Batch scan events
export interface BatchScanRequestedEvent {
  data: {
    batchScanId: string;
    brandId: string;
    userId: string;
    baseQuery: string;
    derivedQueries: Array<{
      query: string;
      type: string;
      intent: string;
      relevanceScore: number;
      expectedBrandMentionLikelihood: 'high' | 'medium' | 'low';
    }>;
    providers: ProviderType[];
    expansionLevel: string;
  };
}

export interface BatchScanCompletedEvent {
  data: {
    batchScanId: string;
    brandId: string;
    userId: string;
    aggregatedScore: number;
    totalQueries: number;
    timestamp: string;
  };
}

// ============================================
// Batch Scan V2 Events (질문 세트 기반)
// ============================================

export interface BatchScanV2StartEvent {
  data: {
    batchScanId: string;
    userId: string;
  };
}

export interface BatchScanV2ResumeEvent {
  data: {
    batchScanId: string;
    userId: string;
  };
}

export interface BatchScanV2CompletedEvent {
  data: {
    batchScanId: string;
    userId: string;
    overallExposureRate: number;
    totalQuestions: number;
    timestamp: string;
  };
}

export interface BatchScanV2FailedEvent {
  data: {
    batchScanId: string;
    userId: string;
    reason: string;
    timestamp: string;
  };
}

/**
 * All Fantascan AI event types
 */
export type FantascanEvents = {
  'scan/brand.requested': ScanBrandRequestedEvent;
  'scan/brand.completed': ScanBrandCompletedEvent;
  'scan/batch.requested': BatchScanRequestedEvent;
  'scan/batch.completed': BatchScanCompletedEvent;
  'brand/scan.requested': BrandScanRequestedEvent;
  'brand/scan.completed': BrandScanCompletedEvent;
  'search/analyze.requested': SearchAnalyzeRequestedEvent;
  'report/generate.requested': ReportGenerateRequestedEvent;
  'alert/visibility.changed': AlertVisibilityChangedEvent;
  // Batch Scan V2
  'batch-scan/v2.start': BatchScanV2StartEvent;
  'batch-scan/v2.resume': BatchScanV2ResumeEvent;
  'batch-scan/v2.completed': BatchScanV2CompletedEvent;
  'batch-scan/v2.failed': BatchScanV2FailedEvent;
};
