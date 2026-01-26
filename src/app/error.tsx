'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import * as Sentry from '@sentry/nextjs';
import { WarningCircle, ArrowCounterClockwise, House } from '@phosphor-icons/react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development
    console.error('Global error:', error);

    // Send to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ko">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full space-y-6 text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-red-100 p-4">
                <WarningCircle size={48} weight="fill" className="text-red-600" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-gray-900">
                문제가 발생했습니다
              </h1>
              <p className="text-gray-600">
                죄송합니다. 예상치 못한 오류가 발생했습니다.
                잠시 후 다시 시도해 주세요.
              </p>
            </div>

            {error.digest && (
              <p className="text-xs text-gray-400">
                오류 코드: {error.digest}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={reset}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <ArrowCounterClockwise size={20} weight="bold" />
                다시 시도
              </button>

              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                <House size={20} weight="bold" />
                홈으로
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
