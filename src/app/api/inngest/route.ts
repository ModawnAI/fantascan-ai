import { serve } from 'inngest/next';
import { inngest, allFunctions } from '@inngest/index';

/**
 * Inngest API Route
 * Serves all Inngest functions for Fantascan AI
 *
 * Functions registered:
 * - brandScanFunction: Handles brand monitoring scans
 * - scheduledDailyScanFunction: Daily automated brand scans (6 AM KST)
 * - reportGenerationFunction: Generates visibility reports
 * - scheduledWeeklyReportFunction: Weekly report generation (Monday 9 AM KST)
 * - visibilityAlertFunction: Sends alerts on visibility changes
 * - visibilityAnomalyCheckFunction: Hourly anomaly detection
 *
 * Development: npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: allFunctions,
});
