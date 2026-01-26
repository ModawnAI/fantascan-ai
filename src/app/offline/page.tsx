'use client';

import { WifiSlash, ArrowClockwise } from '@phosphor-icons/react';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-100 rounded-full mb-6">
            <WifiSlash size={40} className="text-orange-600" weight="duotone" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            오프라인 상태입니다
          </h1>
          <p className="text-gray-600">
            인터넷 연결이 끊겼습니다.
            <br />
            네트워크 연결을 확인하고 다시 시도해주세요.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
          >
            <ArrowClockwise size={20} weight="bold" />
            다시 시도
          </button>

          <p className="text-sm text-gray-500">
            오프라인에서도 일부 캐시된 페이지를 볼 수 있습니다.
          </p>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <h2 className="text-sm font-medium text-gray-900 mb-4">
            오프라인 사용 팁
          </h2>
          <ul className="text-sm text-gray-600 space-y-2 text-left">
            <li className="flex items-start gap-2">
              <span className="text-orange-500 mt-0.5">•</span>
              <span>최근 방문한 페이지는 캐시에서 볼 수 있습니다</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 mt-0.5">•</span>
              <span>새 스캔 생성이나 데이터 수정은 온라인 연결이 필요합니다</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 mt-0.5">•</span>
              <span>연결이 복원되면 자동으로 최신 데이터를 불러옵니다</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
