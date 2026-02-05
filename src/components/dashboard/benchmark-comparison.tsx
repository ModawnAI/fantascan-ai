'use client';

import { motion } from 'motion/react';
import { 
  ChartBar, 
  Trophy,
  TrendUp,
  TrendDown,
  Minus,
  Info,
} from '@phosphor-icons/react';

interface BenchmarkData {
  brandScore: number;
  industryAverage: number;
  industryTop10: number;
  industryTop25: number;
  industryTop50: number;
  competitorScores: Array<{
    name: string;
    score: number;
  }>;
  percentileRank: number;
}

interface BenchmarkComparisonProps {
  data: BenchmarkData | null;
  industryName?: string;
  isLoading?: boolean;
}

export function BenchmarkComparison({
  data,
  industryName = '산업',
  isLoading = false,
}: BenchmarkComparisonProps) {
  const getPercentileLabel = (percentile: number) => {
    if (percentile <= 10) return { label: '상위 10%', color: 'text-green-400', bg: 'bg-green-500' };
    if (percentile <= 25) return { label: '상위 25%', color: 'text-blue-400', bg: 'bg-blue-500' };
    if (percentile <= 50) return { label: '상위 50%', color: 'text-yellow-400', bg: 'bg-yellow-500' };
    return { label: '하위 50%', color: 'text-red-400', bg: 'bg-red-500' };
  };

  const getComparisonText = (brandScore: number, average: number) => {
    const diff = brandScore - average;
    if (diff > 15) return { text: '평균 대비 크게 앞섬', icon: TrendUp, color: 'text-green-400' };
    if (diff > 5) return { text: '평균 대비 앞섬', icon: TrendUp, color: 'text-green-400' };
    if (diff > -5) return { text: '평균 수준', icon: Minus, color: 'text-yellow-400' };
    if (diff > -15) return { text: '평균 대비 뒤처짐', icon: TrendDown, color: 'text-orange-400' };
    return { text: '평균 대비 크게 뒤처짐', icon: TrendDown, color: 'text-red-400' };
  };

  if (isLoading) {
    return (
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-2 mb-4">
          <ChartBar size={20} weight="duotone" className="text-primary-400" />
          <h3 className="text-base font-medium text-white/60">산업 벤치마크</h3>
        </div>
        <div className="space-y-4">
          <div className="h-20 bg-white/5 rounded-lg animate-pulse" />
          <div className="h-32 bg-white/5 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-2 mb-4">
          <ChartBar size={20} weight="duotone" className="text-primary-400" />
          <h3 className="text-base font-medium text-white/60">산업 벤치마크</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Info size={32} weight="duotone" className="text-white/20 mb-2" />
          <p className="text-sm text-white/50">벤치마크 데이터가 없습니다</p>
          <p className="text-xs text-white/40 mt-1">스캔 결과가 축적되면 비교할 수 있습니다</p>
        </div>
      </div>
    );
  }

  const percentileInfo = getPercentileLabel(data.percentileRank);
  const comparison = getComparisonText(data.brandScore, data.industryAverage);
  const ComparisonIcon = comparison.icon;

  // Calculate position on the scale (0-100%)
  const scalePosition = Math.min(100, Math.max(0, data.brandScore));

  return (
    <div id="benchmark-comparison" className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ChartBar size={20} weight="duotone" className="text-primary-400" />
          <h3 className="text-base font-medium text-white/60">산업 벤치마크</h3>
        </div>
        <span className="text-xs text-white/40">{industryName}</span>
      </div>

      {/* Percentile Rank Badge */}
      <div className="flex items-center gap-3 mb-6">
        <div className={`flex items-center gap-2 px-3 py-1.5 ${percentileInfo.bg}/20 rounded-full`}>
          <Trophy size={16} weight="fill" className={percentileInfo.color} />
          <span className={`text-sm font-semibold ${percentileInfo.color}`}>
            {percentileInfo.label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <ComparisonIcon size={14} weight="bold" className={comparison.color} />
          <span className={`text-xs ${comparison.color}`}>{comparison.text}</span>
        </div>
      </div>

      {/* Visual Scale */}
      <div className="mb-6">
        <div className="relative h-8">
          {/* Background track */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 bg-gradient-to-r from-red-500/30 via-yellow-500/30 to-green-500/30 rounded-full" />
          
          {/* Markers */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-1">
            {/* Industry markers */}
            <motion.div
              className="absolute w-0.5 h-4 bg-white/30 -translate-x-1/2"
              style={{ left: `${data.industryTop50}%` }}
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{ delay: 0.2 }}
            />
            <motion.div
              className="absolute w-0.5 h-4 bg-white/40 -translate-x-1/2"
              style={{ left: `${data.industryTop25}%` }}
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{ delay: 0.3 }}
            />
            <motion.div
              className="absolute w-0.5 h-4 bg-white/50 -translate-x-1/2"
              style={{ left: `${data.industryTop10}%` }}
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{ delay: 0.4 }}
            />
          </div>
          
          {/* Brand marker */}
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
            style={{ left: `${scalePosition}%` }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: 'spring' }}
          >
            <div className="relative">
              <div className={`w-4 h-4 rounded-full ${percentileInfo.bg} shadow-lg shadow-primary-500/30`} />
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <div className="bg-gray-900 border border-white/20 rounded px-2 py-1 text-xs font-bold text-white">
                  {data.brandScore}점
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Scale labels */}
        <div className="flex justify-between mt-4 text-xs text-white/40">
          <span>0</span>
          <div className="flex gap-8">
            <span className="text-white/30">상위 50%</span>
            <span className="text-white/40">상위 25%</span>
            <span className="text-white/50">상위 10%</span>
          </div>
          <span>100</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 bg-white/5 rounded-xl">
          <p className="text-xs text-white/40 mb-1">내 점수</p>
          <p className="text-xl font-bold text-primary-400">{data.brandScore}</p>
        </div>
        <div className="p-3 bg-white/5 rounded-xl">
          <p className="text-xs text-white/40 mb-1">산업 평균</p>
          <p className="text-xl font-bold text-white/80">{data.industryAverage}</p>
        </div>
        <div className="p-3 bg-white/5 rounded-xl">
          <p className="text-xs text-white/40 mb-1">상위 10%</p>
          <p className="text-xl font-bold text-green-400">{data.industryTop10}</p>
        </div>
      </div>

      {/* Competitor Comparison */}
      {data.competitorScores.length > 0 && (
        <div className="pt-4 border-t border-white/10">
          <p className="text-xs font-medium text-white/40 mb-3">경쟁사 비교</p>
          <div className="space-y-2">
            {data.competitorScores.map((competitor, index) => (
              <motion.div
                key={competitor.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className="flex items-center gap-3"
              >
                <span className="w-20 truncate text-xs text-white/60">{competitor.name}</span>
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      competitor.score > data.brandScore ? 'bg-red-400' :
                      competitor.score < data.brandScore ? 'bg-green-400' : 'bg-yellow-400'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${competitor.score}%` }}
                    transition={{ delay: 0.2 + 0.1 * index, duration: 0.5 }}
                  />
                </div>
                <span className={`text-xs font-medium w-8 text-right ${
                  competitor.score > data.brandScore ? 'text-red-400' :
                  competitor.score < data.brandScore ? 'text-green-400' : 'text-yellow-400'
                }`}>
                  {competitor.score}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
