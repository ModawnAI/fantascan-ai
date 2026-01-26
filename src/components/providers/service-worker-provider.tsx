'use client';

import { useEffect } from 'react';
import { useServiceWorker } from '@/hooks/use-service-worker';

interface ServiceWorkerProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that initializes the service worker
 * and provides offline status to the application.
 */
export function ServiceWorkerProvider({
  children,
}: ServiceWorkerProviderProps) {
  const { isOnline, updateAvailable } = useServiceWorker();

  // Show update notification when available
  useEffect(() => {
    if (updateAvailable) {
      // Could show a toast or banner here
      console.log('[SW] New version available. Refresh to update.');
    }
  }, [updateAvailable]);

  // Log offline/online status changes
  useEffect(() => {
    if (!isOnline) {
      console.log('[App] You are offline. Some features may be unavailable.');
    }
  }, [isOnline]);

  return <>{children}</>;
}
