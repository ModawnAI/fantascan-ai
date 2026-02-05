'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GraduationCap, X, ArrowClockwise } from '@phosphor-icons/react';
import { useOnboarding } from '@/components/providers/onboarding-provider';

export function OnboardingTrigger() {
  const { currentTourId, restartTour, status, resetOnboarding } = useOnboarding();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  if (!currentTourId) return null;

  const tourNames: Record<string, string> = {
    dashboard: '대시보드 가이드',
    scan: '스캔 가이드',
    results: '결과 분석 가이드',
    settings: '설정 가이드',
  };

  const handleStartTour = () => {
    setIsExpanded(false);
    restartTour(currentTourId);
  };

  const handleResetAll = async () => {
    setIsExpanded(false);
    await resetOnboarding();
    restartTour(currentTourId);
  };

  return (
    <>
      {/* Floating trigger button */}
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
      >
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-16 right-0 mb-2"
            >
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-2xl min-w-[220px]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">가이드 메뉴</h3>
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="p-1 hover:bg-white/10 rounded-md transition-colors"
                  >
                    <X size={14} weight="bold" className="text-white/60" />
                  </button>
                </div>
                
                <div className="space-y-2">
                  <button
                    onClick={handleStartTour}
                    className="w-full flex items-center gap-3 px-3 py-2.5 bg-primary-500/10 hover:bg-primary-500/20 border border-primary-500/20 rounded-lg text-left transition-colors group"
                  >
                    <GraduationCap 
                      size={18} 
                      weight="duotone" 
                      className="text-primary-500 flex-shrink-0"
                    />
                    <div>
                      <p className="text-sm font-medium text-white group-hover:text-primary-400 transition-colors">
                        {tourNames[currentTourId]}
                      </p>
                      <p className="text-xs text-white/50">현재 페이지 투어 시작</p>
                    </div>
                  </button>

                  {status.completedTours.length > 0 && (
                    <button
                      onClick={handleResetAll}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 border border-white/5 rounded-lg text-left transition-colors group"
                    >
                      <ArrowClockwise 
                        size={18} 
                        weight="duotone" 
                        className="text-white/60 group-hover:text-white/80 flex-shrink-0"
                      />
                      <div>
                        <p className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">
                          모든 가이드 초기화
                        </p>
                        <p className="text-xs text-white/40">처음부터 다시 보기</p>
                      </div>
                    </button>
                  )}
                </div>

                {/* Completion status */}
                {status.completedTours.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-xs text-white/40">
                      완료한 가이드: {status.completedTours.length}/4
                    </p>
                    <div className="flex gap-1 mt-1.5">
                      {['dashboard', 'scan', 'results', 'settings'].map((tour) => (
                        <div
                          key={tour}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            status.completedTours.includes(tour)
                              ? 'bg-primary-500'
                              : 'bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main button */}
        <motion.button
          onClick={() => setIsExpanded(!isExpanded)}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`
            relative w-12 h-12 rounded-full shadow-lg 
            bg-gradient-to-br from-primary-500 to-primary-600
            hover:from-primary-400 hover:to-primary-500
            flex items-center justify-center
            transition-all duration-200
            ${isExpanded ? 'ring-2 ring-primary-400 ring-offset-2 ring-offset-black' : ''}
          `}
        >
          <GraduationCap 
            size={24} 
            weight="duotone" 
            className="text-white"
          />
          
          {/* Pulse animation for new users */}
          {!status.completed && !status.skipped && status.completedTours.length === 0 && (
            <motion.span
              className="absolute inset-0 rounded-full bg-primary-500"
              animate={{
                scale: [1, 1.5, 1.5],
                opacity: [0.5, 0, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeOut',
              }}
            />
          )}
        </motion.button>

        {/* Tooltip */}
        <AnimatePresence>
          {showTooltip && !isExpanded && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap"
            >
              <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-lg px-3 py-2 shadow-xl">
                <p className="text-sm text-white font-medium">가이드 다시 보기</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
