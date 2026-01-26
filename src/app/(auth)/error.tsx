'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import * as Sentry from '@sentry/nextjs';
import { WarningCircle, ArrowCounterClockwise, SignIn } from '@phosphor-icons/react';

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development
    console.error('Auth error:', error);

    // Send to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-amber-100 p-4">
            <WarningCircle size={48} weight="fill" className="text-amber-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">
            인증 오류
          </h1>
          <p className="text-gray-600">
            로그인 중 문제가 발생했습니다.
            다시 시도해 주세요.
          </p>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
            <p className="text-sm font-mono text-amber-800 break-all">
              {error.message}
            </p>
          </div>
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
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            <SignIn size={20} weight="bold" />
            로그인으로
          </Link>
        </div>
      </div>
    </div>
  );
}
