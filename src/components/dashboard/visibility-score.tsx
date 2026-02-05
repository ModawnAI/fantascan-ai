'use client';

import { motion } from 'motion/react';
import { TrendUp, TrendDown, Minus, Clock, Eye, Sparkle } from '@phosphor-icons/react';

interface VisibilityScoreProps {
  score: number | null;
  trend: 'up' | 'down' | 'stable' | null;
  lastScanAt: string | null;
  aiScore?: number | null;
  seoScore?: number | null;
  mentionsCount?: number | null;
  totalProviders?: number | null;
}

export function VisibilityScore({
  score,
  trend,
  lastScanAt,
  aiScore,
  seoScore,
  mentionsCount,
  totalProviders,
}: VisibilityScoreProps) {
  const getScoreColor = (score: number) => {
    if (score >= 70) return { text: 'text-green-400', bg: 'bg-green-400', gradient: 'from-green-400 to-emerald-500' };
    if (score >= 40) return { text: 'text-yellow-400', bg: 'bg-yellow-400', gradient: 'from-yellow-400 to-orange-500' };
    return { text: 'text-red-400', bg: 'bg-red-400', gradient: 'from-red-400 to-rose-500' };
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return { label: '우수', desc: 'AI가 적극적으로 추천합니다' };
    if (score >= 60) return { label: '양호', desc: 'AI 인지도가 있습니다' };
    if (score >= 40) return { label: '보통', desc: '개선이 필요합니다' };
    if (score >= 20) return { label: '미흡', desc: 'AI 가시성이 낮습니다' };
    return { label: '낮음', desc: '즉각적인 개선이 필요합니다' };
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
  const offset = score !== null ? circumference - (score / 100) * circumference : circumference;

  return (
    <div id="visibility-score" className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkle size={20} weight="duotone" className="text-primary-400" />
          <h3 className="text-base font-medium text-white/60">AI 가시성 점수</h3>
        </div>
        {lastScanAt && (
          <div className="flex items-center gap-1 text-xs text-white/40">
            <Clock size={12} weight="duotone" />
            <span>{formatDate(lastScanAt)}</span>
          </div>
        )}
      </div>

      {score !== null ? (
        <div className="flex flex-col items-center">
          {/* Circular Score Gauge */}
          <div className="relative w-32 h-32 mb-4">
            <svg className="w-32 h-32 -rotate-90">
              {/* Background circle */}
              <circle
                cx="64"
                cy="64"
                r={radius}
                stroke="currentColor"
                strokeWidth="10"
                fill="none"
                className="text-white/10"
              />
              {/* Progress circle */}
              <motion.circle
                cx="64"
                cy="64"
                r={radius}
                stroke="url(#scoreGradient)"
                strokeWidth="10"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
              />
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" className={`${getScoreColor(score).text}`} stopColor="currentColor" />
                  <stop offset="100%" className={`${getScoreColor(score).text}`} stopColor="currentColor" stopOpacity="0.6" />
                </linearGradient>
              </defs>
            </svg>
            {/* Score display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className={`text-4xl font-bold ${getScoreColor(score).text}`}
              >
                {score}
              </motion.span>
              <span className="text-xs text-white/40">/100</span>
            </div>
          </div>

          {/* Score label and trend */}
          <div className="flex items-center gap-2 mb-4">
            <span className={`px-2.5 py-1 text-sm font-medium rounded-full bg-gradient-to-r ${getScoreColor(score).gradient} text-white`}>
              {getScoreLabel(score).label}
            </span>
            {getTrendIcon()}
          </div>

          <p className="text-xs text-white/50 text-center mb-4">
            {getScoreLabel(score).desc}
          </p>

          {/* Sub-scores */}
          {(aiScore !== undefined || seoScore !== undefined || mentionsCount !== undefined) && (
            <div className="w-full grid grid-cols-3 gap-2 pt-4 border-t border-white/10">
              {aiScore !== undefined && aiScore !== null && (
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{aiScore}</p>
                  <p className="text-[10px] text-white/40">AI 점수</p>
                </div>
              )}
              {seoScore !== undefined && seoScore !== null && (
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{seoScore}</p>
                  <p className="text-[10px] text-white/40">SEO 점수</p>
                </div>
              )}
              {mentionsCount !== undefined && mentionsCount !== null && totalProviders && (
                <div className="text-center flex flex-col items-center">
                  <div className="flex items-center gap-1">
                    <Eye weight="fill" size={14} className={mentionsCount > 0 ? 'text-green-400' : 'text-white/30'} />
                    <p className="text-lg font-bold text-white">{mentionsCount}</p>
                  </div>
                  <p className="text-[10px] text-white/40">/{totalProviders} 언급</p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <span className="text-4xl font-bold text-white/20">--</span>
          </div>
          <p className="text-sm text-white/50">아직 스캔 결과가 없습니다</p>
          <p className="text-xs text-white/40 mt-1">새 스캔을 시작하여 확인하세요</p>
        </div>
      )}
    </div>
  );
}
