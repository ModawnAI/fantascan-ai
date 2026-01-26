'use client';

import { ThumbsUp, ThumbsDown, Lightbulb } from '@phosphor-icons/react';

interface QuickInsightsProps {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export function QuickInsights({ strengths, weaknesses, recommendations }: QuickInsightsProps) {
  const hasData = strengths.length > 0 || weaknesses.length > 0 || recommendations.length > 0;

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
      <h3 className="text-base font-medium text-white/60 mb-4">
        빠른 인사이트
      </h3>
      {hasData ? (
        <div className="space-y-4">
          {/* Strengths */}
          {strengths.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ThumbsUp size={16} weight="fill" className="text-green-400" />
                <span className="text-sm font-medium text-green-400">강점</span>
              </div>
              <ul className="space-y-1">
                {strengths.slice(0, 3).map((strength, index) => (
                  <li
                    key={index}
                    className="text-sm text-white/70 pl-6 relative before:absolute before:left-2 before:top-2 before:w-1 before:h-1 before:bg-green-400 before:rounded-full"
                  >
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Weaknesses */}
          {weaknesses.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ThumbsDown size={16} weight="fill" className="text-red-400" />
                <span className="text-sm font-medium text-red-400">개선점</span>
              </div>
              <ul className="space-y-1">
                {weaknesses.slice(0, 3).map((weakness, index) => (
                  <li
                    key={index}
                    className="text-sm text-white/70 pl-6 relative before:absolute before:left-2 before:top-2 before:w-1 before:h-1 before:bg-red-400 before:rounded-full"
                  >
                    {weakness}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb size={16} weight="fill" className="text-yellow-400" />
                <span className="text-sm font-medium text-yellow-400">추천</span>
              </div>
              <ul className="space-y-1">
                {recommendations.slice(0, 3).map((rec, index) => (
                  <li
                    key={index}
                    className="text-sm text-white/70 pl-6 relative before:absolute before:left-2 before:top-2 before:w-1 before:h-1 before:bg-yellow-400 before:rounded-full"
                  >
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Lightbulb size={40} weight="duotone" className="text-white/20 mb-2" />
          <p className="text-sm text-white/50">
            스캔을 실행하면 AI가 분석한 인사이트를 확인할 수 있습니다
          </p>
        </div>
      )}
    </div>
  );
}
