'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Check, CheckCircle } from '@phosphor-icons/react';
import { formatAlertForDisplay } from '@/services/analytics';
import type { Alert } from '@/types/database';

interface AlertsBellProps {
  alerts: Alert[];
  unreadCount: number;
  onMarkAsRead: (alertIds?: string[]) => Promise<{ success: boolean }>;
  isLoading?: boolean;
}

export function AlertsBell({ alerts, unreadCount, onMarkAsRead, isLoading }: AlertsBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    await onMarkAsRead();
  };

  const handleMarkSingleRead = async (alertId: string) => {
    await onMarkAsRead([alertId]);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
      >
        <Bell size={20} weight={unreadCount > 0 ? 'fill' : 'regular'} className="text-white/70" />
        
        {/* Unread badge */}
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-white/10">
              <h3 className="text-sm font-medium text-white">알림</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1"
                >
                  <CheckCircle size={12} />
                  모두 읽음
                </button>
              )}
            </div>

            {/* Alerts List */}
            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-white/40 text-sm">
                  로딩 중...
                </div>
              ) : alerts.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell size={32} weight="thin" className="mx-auto text-white/20" />
                  <p className="mt-2 text-sm text-white/40">알림이 없습니다</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {alerts.map((alert) => {
                    const display = formatAlertForDisplay(alert);
                    
                    return (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`p-3 hover:bg-white/5 transition-colors ${
                          !alert.is_read ? 'bg-orange-500/5' : ''
                        }`}
                      >
                        <div className="flex gap-3">
                          {/* Icon */}
                          <span className="text-lg">{display.icon}</span>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm font-medium ${!alert.is_read ? 'text-white' : 'text-white/70'}`}>
                                {alert.title}
                              </p>
                              {!alert.is_read && (
                                <button
                                  onClick={() => handleMarkSingleRead(alert.id)}
                                  className="text-white/40 hover:text-white/60 p-1"
                                >
                                  <Check size={12} />
                                </button>
                              )}
                            </div>
                            <p className="text-xs text-white/50 mt-0.5 line-clamp-2">
                              {alert.message}
                            </p>
                            <p className="text-xs text-white/30 mt-1">
                              {display.timeAgo}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {alerts.length > 0 && (
              <div className="p-2 border-t border-white/10">
                <button
                  onClick={() => {
                    // TODO: Navigate to full alerts page
                    setIsOpen(false);
                  }}
                  className="w-full text-center text-xs text-white/50 hover:text-white/70 py-2 transition-colors"
                >
                  모든 알림 보기
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
