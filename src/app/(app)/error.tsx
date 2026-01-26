'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import * as Sentry from '@sentry/nextjs';
import { WarningCircle, ArrowCounterClockwise, House, ChatCircle } from '@phosphor-icons/react';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development
    console.error('App error:', error);

    // Send to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-red-400/20 p-4">
            <WarningCircle size={48} weight="fill" className="text-red-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">
            오류가 발생했습니다
          </h1>
          <p className="text-white/60">
            페이지를 불러오는 중 문제가 발생했습니다.
            다시 시도하거나 대시보드로 돌아가 주세요.
          </p>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <div className="bg-red-400/10 border border-red-400/20 rounded-lg p-4 text-left">
            <p className="text-sm font-mono text-red-400 break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-red-400/70 mt-2">
                Digest: {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
          >
            <ArrowCounterClockwise size={20} weight="bold" />
            다시 시도
          </button>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 text-white/70 rounded-lg hover:bg-white/20 transition-colors font-medium"
          >
            <House size={20} weight="bold" />
            대시보드
          </Link>
        </div>

        <div className="pt-4 border-t border-white/10">
          <p className="text-sm text-white/50">
            문제가 지속되면{' '}
            <a
              href="mailto:support@fantascan.ai"
              className="text-primary-400 hover:underline inline-flex items-center gap-1"
            >
              <ChatCircle size={14} />
              고객지원
            </a>
            에 문의해 주세요.
          </p>
        </div>
      </div>
    </div>
  );
}
