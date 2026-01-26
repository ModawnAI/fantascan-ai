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

/**
 * All Fantascan AI event types
 */
export type FantascanEvents = {
  'scan/brand.requested': ScanBrandRequestedEvent;
  'scan/brand.completed': ScanBrandCompletedEvent;
  'brand/scan.requested': BrandScanRequestedEvent;
  'brand/scan.completed': BrandScanCompletedEvent;
  'search/analyze.requested': SearchAnalyzeRequestedEvent;
  'report/generate.requested': ReportGenerateRequestedEvent;
  'alert/visibility.changed': AlertVisibilityChangedEvent;
};
