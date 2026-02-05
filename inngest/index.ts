// Inngest client
export { inngest } from './client';

// Event types
export type { FantascanEvents } from './types';

// Individual function exports
export {
  processBrandScanFunction,
  brandScanFunction,
  scheduledDailyScanFunction,
  processBatchScanFunction,
  reportGenerationFunction,
  scheduledWeeklyReportFunction,
  visibilityAlertFunction,
  visibilityAnomalyCheckFunction,
  // V2 batch scan functions
  batchScanV2StartFunction,
  batchScanV2ResumeFunction,
} from './functions';

// Aggregate all functions for registration
import {
  processBrandScanFunction,
  brandScanFunction,
  scheduledDailyScanFunction,
  processBatchScanFunction,
  reportGenerationFunction,
  scheduledWeeklyReportFunction,
  visibilityAlertFunction,
  visibilityAnomalyCheckFunction,
  batchScanV2StartFunction,
  batchScanV2ResumeFunction,
} from './functions';

export const allFunctions = [
  processBrandScanFunction,
  brandScanFunction,
  scheduledDailyScanFunction,
  processBatchScanFunction,
  reportGenerationFunction,
  scheduledWeeklyReportFunction,
  visibilityAlertFunction,
  visibilityAnomalyCheckFunction,
  // V2 batch scan functions
  batchScanV2StartFunction,
  batchScanV2ResumeFunction,
];
