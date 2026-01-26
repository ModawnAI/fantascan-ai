'use client';

import { motion } from 'motion/react';
import { TrendUp, TrendDown, Minus, Clock } from '@phosphor-icons/react';

interface VisibilityScoreProps {
  score: number | null;
  trend: 'up' | 'down' | 'stable' | null;
  lastScanAt: string | null;
}

export function VisibilityScore({ score, trend, lastScanAt }: VisibilityScoreProps) {
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendUp size={20} weight="bold" className="text-green-400" />;
      case 'down':
        return <TrendDown size={20} weight="bold" className="text-red-400" />;
      default:
        return <Minus size={20} weight="bold" className="text-white/40" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
      <h3 className="text-base font-medium text-white/60 mb-4">
        AI 가시성 점수
      </h3>
      {score !== null ? (
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <motion.span
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`text-5xl font-bold ${getScoreColor(score)}`}
            >
              {score}
            </motion.span>
            <span className="text-lg text-white/50">/100</span>
            <div className="ml-2">{getTrendIcon()}</div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <div className="text-4xl font-bold text-white/20">--</div>
          <p className="mt-2 text-sm text-white/50">
            아직 스캔 결과가 없습니다
          </p>
        </div>
      )}

      {lastScanAt && (
        <div className="flex items-center gap-1 mt-4 text-xs text-white/50">
          <Clock size={12} weight="duotone" />
          <span>마지막 스캔: {formatDate(lastScanAt)}</span>
        </div>
      )}
    </div>
  );
}
