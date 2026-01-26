'use client';

import { useServiceWorker } from '@/hooks/use-service-worker';
import { WifiSlash } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';

/**
 * Displays a banner when the user is offline.
 * Automatically shows/hides based on network status.
 */
export function OfflineIndicator() {
  const { isOnline } = useServiceWorker();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-yellow-900 py-2 px-4"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-sm font-medium">
            <WifiSlash size={18} weight="bold" />
            <span>오프라인 상태입니다. 일부 기능이 제한될 수 있습니다.</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
