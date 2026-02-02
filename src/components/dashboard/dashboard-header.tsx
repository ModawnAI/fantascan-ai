'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { SignOut, Gear, User, CreditCard } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import { useAlerts } from '@/hooks';
import { AlertsBell } from '@/components/analytics';
import type { SubscriptionTier } from '@/types/database';

interface DashboardHeaderProps {
  brandName: string;
  brandId: string;
  credits: number;
  tier: SubscriptionTier;
}

const TIER_LABELS: Record<SubscriptionTier, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
};

export function DashboardHeader({ brandName, brandId, credits, tier }: DashboardHeaderProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  
  // Fetch alerts for the brand
  const { alerts, unreadCount, markAsRead, isLoading: alertsLoading } = useAlerts({
    brandId,
    limit: 10,
  });

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="relative z-50 bg-white/5 backdrop-blur-xl border-b border-white/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="flex items-center">
              <span className="text-xl font-bold text-primary-500">판타스캔</span>
              <span className="text-xl font-bold text-white"> AI</span>
            </a>
            <span className="hidden sm:inline-block px-2 py-1 text-xs font-medium bg-white/10 text-white/70 rounded">
              {brandName}
            </span>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            {/* Alerts Bell */}
            <AlertsBell
              alerts={alerts}
              unreadCount={unreadCount}
              onMarkAsRead={markAsRead}
              isLoading={alertsLoading}
            />
            
            {/* Credits Display */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg">
              <CreditCard size={16} weight="duotone" className="text-white/50" />
              <span className="text-sm font-medium text-white/80">
                {credits.toLocaleString()} 크레딧
              </span>
              <span className="text-xs px-1.5 py-0.5 bg-primary-500/20 text-primary-400 rounded">
                {TIER_LABELS[tier]}
              </span>
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              >
                <User size={20} weight="duotone" className="text-white/70" />
              </button>

              <AnimatePresence>
                {showMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowMenu(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-48 bg-white/10 backdrop-blur-xl rounded-xl border border-white/10 py-1 z-50 overflow-hidden"
                    >
                      <div className="sm:hidden px-3 py-2 border-b border-white/10">
                        <p className="text-xs text-white/50">크레딧</p>
                        <p className="font-medium text-white">{credits.toLocaleString()}</p>
                      </div>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          router.push('/settings');
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors"
                      >
                        <Gear size={16} weight="duotone" />
                        설정
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-white/10 transition-colors"
                      >
                        <SignOut size={16} weight="duotone" />
                        로그아웃
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
