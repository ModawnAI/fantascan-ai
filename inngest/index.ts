// Inngest client
export { inngest } from './client';

// Event types
export type { FantascanEvents } from './types';

// Individual function exports
export {
  processBrandScanFunction,
  brandScanFunction,
  scheduledDailyScanFunction,
  reportGenerationFunction,
  scheduledWeeklyReportFunction,
  visibilityAlertFunction,
  visibilityAnomalyCheckFunction,
} from './functions';

// Aggregate all functions for registration
import {
  processBrandScanFunction,
  brandScanFunction,
  scheduledDailyScanFunction,
  reportGenerationFunction,
  scheduledWeeklyReportFunction,
  visibilityAlertFunction,
  visibilityAnomalyCheckFunction,
} from './functions';

export const allFunctions = [
  processBrandScanFunction,
  brandScanFunction,
  scheduledDailyScanFunction,
  reportGenerationFunction,
  scheduledWeeklyReportFunction,
  visibilityAlertFunction,
  visibilityAnomalyCheckFunction,
];
