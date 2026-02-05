'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock,
  CheckCircle,
  XCircle,
  CircleNotch,
  CaretRight,
  TrendUp,
  TrendDown,
  Minus,
  Eye,
  EyeSlash,
  ChartLine,
  ListBullets,
  GridFour,
} from '@phosphor-icons/react';
import type { Scan, ScanStatus } from '@/types/database';

interface RecentScansProps {
  scans: Scan[];
}

const STATUS_CONFIG: Record<ScanStatus, { label: string; colorClass: string; bgClass: string; Icon: React.ElementType }> = {
  pending: { label: '대기중', colorClass: 'text-white/50', bgClass: 'bg-white/10', Icon: Clock },
  processing: { label: '처리중', colorClass: 'text-blue-400', bgClass: 'bg-blue-400/20', Icon: CircleNotch },
  completed: { label: '완료', colorClass: 'text-green-400', bgClass: 'bg-green-400/20', Icon: CheckCircle },
  failed: { label: '실패', colorClass: 'text-red-400', bgClass: 'bg-red-400/20', Icon: XCircle },
};

const DEFAULT_STATUS = { label: '알 수 없음', colorClass: 'text-white/40', bgClass: 'bg-white/10', Icon: Clock };

function ScoreIndicator({ score, previousScore }: { score: number | null; previousScore?: number | null }) {
  if (score === null) return <span className="text-sm text-white/30">--</span>;

  const getColor = (s: number) => {
    if (s >= 70) return 'text-green-400';
    if (s >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  const trend = previousScore !== undefined && previousScore !== null ? score - previousScore : null;

  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-lg font-bold ${getColor(score)}`}>{score}</span>
      {trend !== null && trend !== 0 && (
        <span className={`flex items-center text-xs ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
          {trend > 0 ? <TrendUp weight="bold" size={12} /> : <TrendDown weight="bold" size={12} />}
          {Math.abs(trend)}
        </span>
      )}
    </div>
  );
}

function MentionIndicator({ mentionsCount, totalProviders }: { mentionsCount: number | null; totalProviders: number }) {
  if (mentionsCount === null) return null;

  const percentage = Math.round((mentionsCount / totalProviders) * 100);
  const color = percentage >= 70 ? 'text-green-400' : percentage >= 40 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="flex items-center gap-1.5">
      {mentionsCount > 0 ? (
        <Eye weight="fill" size={14} className={color} />
      ) : (
        <EyeSlash weight="fill" size={14} className="text-white/30" />
      )}
      <span className={`text-xs ${color}`}>
        {mentionsCount}/{totalProviders}
      </span>
    </div>
  );
}

export function RecentScans({ scans }: RecentScansProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

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
    });
  };

  const formatFullDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Calculate trends by comparing consecutive scans
  const scansWithTrends = scans.map((scan, index) => {
    const previousScan = scans[index + 1];
    return {
      ...scan,
      previousScore: previousScan?.visibility_score ?? null,
    };
  });

  return (
    <div id="recent-scans" className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ChartLine size={20} weight="duotone" className="text-primary-400" />
          <h3 className="text-base font-medium text-white">스캔 히스토리</h3>
          {scans.length > 0 && (
            <span className="px-2 py-0.5 text-xs bg-white/10 rounded-full text-white/50">
              {scans.length}건
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
          >
            <ListBullets size={18} weight="bold" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
          >
            <GridFour size={18} weight="bold" />
          </button>
        </div>
      </div>

      {scans.length > 0 ? (
        <AnimatePresence mode="wait">
          {viewMode === 'list' ? (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              {scansWithTrends.map((scan, index) => {
                const status = STATUS_CONFIG[scan.status] || DEFAULT_STATUS;
                const StatusIcon = status.Icon;

                return (
                  <motion.button
                    key={scan.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => router.push(`/scan/${scan.id}`)}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <StatusIcon
                        size={20}
                        weight="fill"
                        className={`${status.colorClass} ${scan.status === 'processing' ? 'animate-spin' : ''}`}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${status.bgClass} ${status.colorClass}`}>
                            {status.label}
                          </span>
                          <MentionIndicator
                            mentionsCount={scan.mentions_count}
                            totalProviders={scan.total_providers}
                          />
                        </div>
                        <p className="text-xs text-white/40 mt-1" title={formatFullDate(scan.created_at)}>
                          {formatDate(scan.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <ScoreIndicator
                        score={scan.visibility_score}
                        previousScore={scan.previousScore}
                      />
                      <CaretRight size={16} weight="bold" className="text-white/30 group-hover:text-white/60 transition-colors" />
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3"
            >
              {scansWithTrends.map((scan, index) => {
                const status = STATUS_CONFIG[scan.status] || DEFAULT_STATUS;
                const scoreColor = scan.visibility_score !== null
                  ? scan.visibility_score >= 70 ? 'border-green-500/30 bg-green-500/5'
                    : scan.visibility_score >= 40 ? 'border-yellow-500/30 bg-yellow-500/5'
                      : 'border-red-500/30 bg-red-500/5'
                  : 'border-white/10 bg-white/5';

                return (
                  <motion.button
                    key={scan.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => router.push(`/scan/${scan.id}`)}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border ${scoreColor} hover:scale-105 transition-all`}
                  >
                    <ScoreIndicator
                      score={scan.visibility_score}
                      previousScore={scan.previousScore}
                    />
                    <MentionIndicator
                      mentionsCount={scan.mentions_count}
                      totalProviders={scan.total_providers}
                    />
                    <p className="text-[10px] text-white/40 mt-2">{formatDate(scan.created_at)}</p>
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Clock size={48} weight="duotone" className="text-white/10 mb-3" />
          <p className="text-sm text-white/50">아직 스캔 기록이 없습니다</p>
          <p className="text-xs text-white/40 mt-1">새 스캔을 시작하여 브랜드 가시성을 확인하세요</p>
        </div>
      )}
    </div>
  );
}
