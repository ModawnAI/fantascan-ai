'use client';

import { useRouter } from 'next/navigation';
import { Clock, CheckCircle, XCircle, CircleNotch, CaretRight } from '@phosphor-icons/react';
import type { Scan, ScanStatus } from '@/types/database';

interface RecentScansProps {
  scans: Scan[];
}

const STATUS_CONFIG: Record<ScanStatus, { label: string; colorClass: string; Icon: React.ElementType }> = {
  pending: { label: '대기중', colorClass: 'text-white/50', Icon: Clock },
  processing: { label: '처리중', colorClass: 'text-blue-400', Icon: CircleNotch },
  completed: { label: '완료', colorClass: 'text-green-400', Icon: CheckCircle },
  failed: { label: '실패', colorClass: 'text-red-400', Icon: XCircle },
};

const DEFAULT_STATUS = { label: '알 수 없음', colorClass: 'text-white/40', Icon: Clock };

export function RecentScans({ scans }: RecentScansProps) {
  const router = useRouter();

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
        최근 스캔
      </h3>
      {scans.length > 0 ? (
        <div className="space-y-2">
          {scans.map((scan) => {
            const status = STATUS_CONFIG[scan.status] || DEFAULT_STATUS;
            const StatusIcon = status.Icon;

            return (
              <button
                key={scan.id}
                onClick={() => router.push(`/scan/${scan.id}`)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <StatusIcon
                    size={20}
                    weight="fill"
                    className={`${status.colorClass} ${scan.status === 'processing' ? 'animate-spin' : ''}`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          scan.status === 'completed'
                            ? 'bg-green-400/20 text-green-400'
                            : scan.status === 'failed'
                            ? 'bg-red-400/20 text-red-400'
                            : scan.status === 'processing'
                            ? 'bg-blue-400/20 text-blue-400'
                            : 'bg-white/10 text-white/50'
                        }`}
                      >
                        {status.label}
                      </span>
                      <span className="text-sm text-white/70">
                        {scan.total_providers}개 제공자
                      </span>
                    </div>
                    <p className="text-xs text-white/50 mt-1">
                      {formatDate(scan.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {scan.status === 'processing' && (
                    <span className="text-xs text-white/50">
                      처리중
                    </span>
                  )}
                  <CaretRight size={16} weight="bold" className="text-white/40" />
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Clock size={40} weight="duotone" className="text-white/20 mb-2" />
          <p className="text-sm text-white/50">
            아직 스캔 기록이 없습니다
          </p>
          <p className="text-xs text-white/40 mt-1">
            새 스캔을 시작하여 브랜드 가시성을 확인하세요
          </p>
        </div>
      )}
    </div>
  );
}
