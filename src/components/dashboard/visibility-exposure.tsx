'use client';

import { motion } from 'motion/react';
import { TrendUp, TrendDown, Minus, Clock, ChartPie, Target } from '@phosphor-icons/react';

interface VisibilityExposureProps {
  exposureRate: number | null;
  lastScanAt: string | null;
  totalQuestions: number;
  totalIterations: number;
}

export function VisibilityExposure({
  exposureRate,
  lastScanAt,
  totalQuestions,
  totalIterations,
}: VisibilityExposureProps) {
  const getScoreColor = (rate: number) => {
    if (rate >= 50) return { text: 'text-green-400', bg: 'bg-green-400', gradient: 'from-green-400 to-emerald-500' };
    if (rate >= 30) return { text: 'text-yellow-400', bg: 'bg-yellow-400', gradient: 'from-yellow-400 to-orange-500' };
    return { text: 'text-red-400', bg: 'bg-red-400', gradient: 'from-red-400 to-rose-500' };
  };

  const getScoreLabel = (rate: number) => {
    if (rate >= 70) return { label: '우수', desc: 'AI가 브랜드를 자주 언급합니다' };
    if (rate >= 50) return { label: '양호', desc: '평균 이상의 노출도입니다' };
    if (rate >= 30) return { label: '보통', desc: '개선 여지가 있습니다' };
    if (rate >= 15) return { label: '미흡', desc: '노출도를 높일 필요가 있습니다' };
    return { label: '낮음', desc: '즉각적인 개선이 필요합니다' };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return '방금 전';
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;

    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Calculate circumference for the circular progress
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = exposureRate !== null ? circumference - (exposureRate / 100) * circumference : circumference;

  return (
    <div id="visibility-exposure" className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target size={20} weight="duotone" className="text-primary-400" />
          <h3 className="text-base font-medium text-white/60">AI 가시성 노출도</h3>
        </div>
        {lastScanAt && (
          <div className="flex items-center gap-1 text-xs text-white/40">
            <Clock size={14} />
            <span>{formatDate(lastScanAt)}</span>
          </div>
        )}
      </div>

      {exposureRate !== null ? (
        <div className="flex items-center gap-6">
          {/* Circular Progress */}
          <div className="relative">
            <svg width="120" height="120" className="transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="12"
              />
              {/* Progress circle */}
              <motion.circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="url(#exposureGradient)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
              />
              <defs>
                <linearGradient id="exposureGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={getScoreColor(exposureRate).text.replace('text-', '#').replace('-400', '')} />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
            </svg>
            {/* Score in center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                className={`text-3xl font-bold ${getScoreColor(exposureRate).text}`}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
              >
                {exposureRate.toFixed(1)}%
              </motion.span>
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 space-y-3">
            <div>
              <span className={`text-lg font-semibold ${getScoreColor(exposureRate).text}`}>
                {getScoreLabel(exposureRate).label}
              </span>
              <p className="text-sm text-white/50 mt-0.5">
                {getScoreLabel(exposureRate).desc}
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-white/50">분석 질문 수</span>
                <span className="text-white font-medium">{totalQuestions}개</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">총 API 호출</span>
                <span className="text-white font-medium">{totalIterations.toLocaleString()}회</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <ChartPie size={48} weight="duotone" className="text-white/20 mb-3" />
          <p className="text-white/50 text-sm">아직 스캔 데이터가 없습니다</p>
          <p className="text-white/30 text-xs mt-1">새 스캔을 시작해보세요</p>
        </div>
      )}
    </div>
  );
}
