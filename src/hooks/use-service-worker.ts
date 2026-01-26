'use client';

import { useEffect, useState, useCallback } from 'react';

interface ServiceWorkerState {
  isSupported: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  registration: ServiceWorkerRegistration | null;
  updateAvailable: boolean;
}

export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isInstalled: false,
    isOnline: true,
    registration: null,
    updateAvailable: false,
  });

  // Register service worker
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isSupported = 'serviceWorker' in navigator;
    setState((prev) => ({
      ...prev,
      isSupported,
      isOnline: navigator.onLine,
    }));

    if (!isSupported) return;

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        console.log('[SW] Registered with scope:', registration.scope);

        setState((prev) => ({
          ...prev,
          isInstalled: true,
          registration,
        }));

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              // New service worker available
              setState((prev) => ({ ...prev, updateAvailable: true }));
            }
          });
        });

        // Check for updates periodically (every hour)
        setInterval(
          () => {
            registration.update();
          },
          60 * 60 * 1000
        );
      } catch (error) {
        console.error('[SW] Registration failed:', error);
      }
    };

    registerSW();

    // Listen for controller changes
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW] Controller changed, reloading...');
    });
  }, []);

  // Handle online/offline status
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update service worker
  const update = useCallback(async () => {
    if (!state.registration) return;

    try {
      await state.registration.update();
      // Skip waiting and activate new worker
      state.registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
      // Reload the page to use the new worker
      window.location.reload();
    } catch (error) {
      console.error('[SW] Update failed:', error);
    }
  }, [state.registration]);

  // Clear all caches
  const clearCache = useCallback(async () => {
    if (!state.registration?.active) return;

    state.registration.active.postMessage({ type: 'CLEAR_CACHE' });
  }, [state.registration]);

  // Unregister service worker
  const unregister = useCallback(async () => {
    if (!state.registration) return;

    try {
      await state.registration.unregister();
      setState((prev) => ({
        ...prev,
        isInstalled: false,
        registration: null,
      }));
    } catch (error) {
      console.error('[SW] Unregister failed:', error);
    }
  }, [state.registration]);

  return {
    ...state,
    update,
    clearCache,
    unregister,
  };
}
