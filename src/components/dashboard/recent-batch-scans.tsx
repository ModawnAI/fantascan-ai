'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import {
  Clock,
  Check,
  CircleNotch,
  Pause,
  X,
  CaretRight,
  ListChecks,
  ChartLine,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

type BatchScanStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed';

interface BatchScanData {
  id: string;
  status: BatchScanStatus;
  total_questions: number;
  completed_questions: number;
  total_iterations: number;
  completed_iterations: number;
  overall_exposure_rate: number | null;
  created_at: string;
  completed_at: string | null;
  question_sets?: { name: string }[] | { name: string } | null;
}

interface RecentBatchScansProps {
  scans: BatchScanData[];
}

const STATUS_CONFIG: Record<BatchScanStatus, { icon: typeof Check; color: string; label: string }> = {
  pending: { icon: Clock, color: 'text-gray-400', label: '대기중' },
  running: { icon: CircleNotch, color: 'text-blue-400', label: '진행중' },
  paused: { icon: Pause, color: 'text-yellow-400', label: '일시정지' },
  completed: { icon: Check, color: 'text-green-400', label: '완료' },
  failed: { icon: X, color: 'text-red-400', label: '실패' },
};

export function RecentBatchScans({ scans }: RecentBatchScansProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (startDate: string, endDate: string | null) => {
    if (!endDate) return '-';
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const diffMs = end - start;
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}시간 ${minutes % 60}분`;
    }
    return `${minutes}분`;
  };

  const getProgress = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const getExposureColor = (rate: number | null) => {
    if (rate === null) return 'text-white/30';
    if (rate >= 50) return 'text-green-400';
    if (rate >= 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (scans.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-2 mb-4">
          <ListChecks size={20} weight="duotone" className="text-primary-400" />
          <h3 className="text-base font-medium text-white/60">최근 스캔</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ChartLine size={48} weight="duotone" className="text-white/20 mb-3" />
          <p className="text-white/50 text-sm">아직 스캔 기록이 없습니다</p>
          <Link href="/scan/new">
            <Button variant="default" size="sm" className="mt-4">
              첫 스캔 시작하기
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks size={20} weight="duotone" className="text-primary-400" />
          <h3 className="text-base font-medium text-white/60">최근 스캔 히스토리</h3>
          <span className="text-xs text-white/30 bg-white/5 px-2 py-0.5 rounded-full">
            {scans.length}개
          </span>
        </div>
        <Link href="/scan/new">
          <Button variant="ghost" size="sm" className="text-primary-400">
            새 스캔
            <CaretRight size={14} className="ml-1" />
          </Button>
        </Link>
      </div>

      {/* Scan List */}
      <div className="divide-y divide-white/5">
        {scans.map((scan, index) => {
          const statusConfig = STATUS_CONFIG[scan.status];
          const StatusIcon = statusConfig.icon;
          const progress = getProgress(scan.completed_iterations, scan.total_iterations);

          return (
            <motion.div
              key={scan.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                href={`/scan/${scan.id}`}
                className="block px-4 py-3 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {/* Status Icon */}
                  <div className={`flex-shrink-0 ${statusConfig.color}`}>
                    <StatusIcon
                      size={20}
                      weight={scan.status === 'running' ? 'bold' : 'fill'}
                      className={scan.status === 'running' ? 'animate-spin' : ''}
                    />
                  </div>

                  {/* Main Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">
                        {Array.isArray(scan.question_sets) 
                          ? scan.question_sets[0]?.name 
                          : scan.question_sets?.name || '질문 세트'}
                      </span>
                      <span className={`text-xs ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-white/40">
                      <span>{formatDate(scan.created_at)}</span>
                      <span>•</span>
                      <span>{scan.total_questions}개 질문</span>
                      <span>•</span>
                      <span>{scan.total_iterations.toLocaleString()}회 호출</span>
                      {scan.completed_at && (
                        <>
                          <span>•</span>
                          <span>{formatDuration(scan.created_at, scan.completed_at)}</span>
                        </>
                      )}
                    </div>

                    {/* Progress Bar (for running/paused scans) */}
                    {(scan.status === 'running' || scan.status === 'paused') && (
                      <div className="mt-2">
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              scan.status === 'running' ? 'bg-blue-400' : 'bg-yellow-400'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-white/40 mt-1">
                          {progress}% 완료 ({scan.completed_iterations.toLocaleString()}/{scan.total_iterations.toLocaleString()})
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Exposure Rate */}
                  <div className="flex-shrink-0 text-right">
                    {scan.status === 'completed' && scan.overall_exposure_rate !== null ? (
                      <div>
                        <span className={`text-lg font-bold ${getExposureColor(scan.overall_exposure_rate)}`}>
                          {scan.overall_exposure_rate.toFixed(1)}%
                        </span>
                        <span className="block text-xs text-white/40">노출도</span>
                      </div>
                    ) : (
                      <CaretRight size={20} className="text-white/30" />
                    )}
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* View All */}
      {scans.length >= 10 && (
        <div className="p-4 border-t border-white/10 text-center">
          <Link href="/scans" className="text-sm text-primary-400 hover:text-primary-300">
            모든 스캔 보기 →
          </Link>
        </div>
      )}
    </div>
  );
}
