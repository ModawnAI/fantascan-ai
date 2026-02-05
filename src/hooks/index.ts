/**
 * Custom Hooks
 *
 * Centralized exports for all custom React hooks.
 * Uses SWR for data fetching with caching and revalidation.
 */

// Brand hooks
export {
  useBrands,
  useBrand,
  useCreateBrand,
  useUpdateBrand,
  useDeleteBrand,
  prefetchBrands,
} from './use-brands';

// Scan hooks
export {
  useScans,
  useScan,
  useCreateScan,
  useDeleteScan,
  useScanPolling,
  prefetchScans,
  prefetchScan,
} from './use-scans';

// User hooks
export {
  useUser,
  useUpdateUser,
  useUserCredits,
  prefetchUser,
} from './use-user';

// Service Worker hooks
export { useServiceWorker } from './use-service-worker';

// Analytics hooks
export {
  useTrends,
  useShareOfVoice,
  useCitations,
  useRecommendations,
  useAlerts,
  useAlertConfigs,
} from './use-analytics';

// Question Set hooks
export {
  useQuestionSets,
  useQuestionSet,
  useCreateQuestionSet,
  useUpdateQuestionSet,
  useDeleteQuestionSet,
  useAddQuestionItem,
  useUpdateQuestionItem,
  useDeleteQuestionItem,
  useReorderQuestionItems,
  QUESTION_SET_API,
} from './use-question-sets';

// Scan Settings hooks
export {
  useScanSettings,
  useUpdateScanSettings,
  SCAN_SETTINGS_API,
} from './use-scan-settings';

// Batch Scan hooks
export {
  useBatchScans,
  useBatchScan,
  useCreateBatchScan,
  usePauseBatchScan,
  useResumeBatchScan,
  useDeleteBatchScan,
  BATCH_SCAN_API,
} from './use-batch-scans';
