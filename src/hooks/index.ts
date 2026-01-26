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
