'use client';

// Global error boundary that captures errors for Sentry
// This file handles errors in the root layout

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ko">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">500</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              심각한 오류가 발생했습니다
            </h1>
            <p className="text-gray-600 mb-6">
              죄송합니다. 애플리케이션에 문제가 발생했습니다.
              <br />
              페이지를 다시 로드하거나 나중에 다시 시도해 주세요.
            </p>
            <button
              onClick={() => reset()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              다시 시도
            </button>
            {error.digest && (
              <p className="text-sm text-gray-400 mt-4">
                오류 ID: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
