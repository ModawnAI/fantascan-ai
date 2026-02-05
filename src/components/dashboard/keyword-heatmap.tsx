'use client';

import { motion } from 'motion/react';
import { 
  Table, 
  TrendUp, 
  TrendDown, 
  Minus,
  Info,
} from '@phosphor-icons/react';
import type { ProviderType } from '@/types/database';
import { PROVIDER_DISPLAY } from '@/types/database';

interface KeywordHeatmapData {
  keyword: string;
  providers: Array<{
    provider: ProviderType;
    score: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  overallScore: number;
  overallTrend: 'up' | 'down' | 'stable';
}

interface KeywordHeatmapProps {
  data: KeywordHeatmapData[];
  providers?: ProviderType[];
  isLoading?: boolean;
}

const DEFAULT_PROVIDERS: ProviderType[] = ['openai', 'gemini', 'anthropic', 'perplexity', 'grok'];

export function KeywordHeatmap({ 
  data, 
  providers = DEFAULT_PROVIDERS,
  isLoading = false,
}: KeywordHeatmapProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500/80 text-white';
    if (score >= 60) return 'bg-green-500/50 text-white';
    if (score >= 40) return 'bg-yellow-500/60 text-white';
    if (score >= 20) return 'bg-orange-500/60 text-white';
    return 'bg-red-500/50 text-white';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    if (score >= 20) return 'Poor';
    return 'None';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable', size: number = 12) => {
    switch (trend) {
      case 'up':
        return <TrendUp size={size} weight="bold" className="text-green-400" />;
      case 'down':
        return <TrendDown size={size} weight="bold" className="text-red-400" />;
      default:
        return <Minus size={size} weight="bold" className="text-white/40" />;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Table size={20} weight="duotone" className="text-primary-400" />
          <h3 className="text-base font-medium text-white/60">키워드 노출 히트맵</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Table size={20} weight="duotone" className="text-primary-400" />
          <h3 className="text-base font-medium text-white/60">키워드 노출 히트맵</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Info size={32} weight="duotone" className="text-white/20 mb-2" />
          <p className="text-sm text-white/50">아직 키워드 데이터가 없습니다</p>
          <p className="text-xs text-white/40 mt-1">스캔을 실행하여 데이터를 수집하세요</p>
        </div>
      </div>
    );
  }

  return (
    <div id="keyword-heatmap" className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Table size={20} weight="duotone" className="text-primary-400" />
          <h3 className="text-base font-medium text-white/60">키워드 노출 히트맵</h3>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/40">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500/80" />
            <span>80+</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-yellow-500/60" />
            <span>40-79</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-500/50" />
            <span>&lt;40</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left py-2 px-3 text-xs font-medium text-white/40 border-b border-white/10">
                키워드
              </th>
              {providers.map(provider => (
                <th 
                  key={provider}
                  className="text-center py-2 px-2 text-xs font-medium text-white/40 border-b border-white/10 min-w-[80px]"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span
                      className="w-5 h-5 flex items-center justify-center rounded text-white text-[10px] font-bold"
                      style={{ backgroundColor: PROVIDER_DISPLAY[provider].color }}
                    >
                      {PROVIDER_DISPLAY[provider].icon}
                    </span>
                    <span className="hidden sm:inline">{PROVIDER_DISPLAY[provider].name}</span>
                  </div>
                </th>
              ))}
              <th className="text-center py-2 px-3 text-xs font-medium text-white/40 border-b border-white/10">
                평균
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <motion.tr
                key={row.keyword}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: rowIndex * 0.05 }}
                className="hover:bg-white/5 transition-colors"
              >
                <td className="py-3 px-3 text-sm font-medium text-white/80 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="truncate max-w-[120px]">{row.keyword}</span>
                    {getTrendIcon(row.overallTrend)}
                  </div>
                </td>
                {providers.map(provider => {
                  const providerData = row.providers.find(p => p.provider === provider);
                  const score = providerData?.score || 0;
                  return (
                    <td 
                      key={provider}
                      className="py-2 px-2 text-center border-b border-white/5"
                    >
                      <motion.div
                        className={`inline-flex items-center justify-center min-w-[48px] px-2 py-1 rounded-md text-sm font-bold ${getScoreColor(score)}`}
                        whileHover={{ scale: 1.05 }}
                        title={getScoreLabel(score)}
                      >
                        {score}
                      </motion.div>
                    </td>
                  );
                })}
                <td className="py-2 px-3 text-center border-b border-white/5">
                  <div className="flex items-center justify-center gap-1">
                    <span className={`text-sm font-bold ${
                      row.overallScore >= 60 ? 'text-green-400' : 
                      row.overallScore >= 40 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {row.overallScore}
                    </span>
                    {getTrendIcon(row.overallTrend, 14)}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
