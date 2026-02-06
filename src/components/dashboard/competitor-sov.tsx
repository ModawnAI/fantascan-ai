'use client';

import { useMemo } from 'react';
import { motion } from 'motion/react';
import { ChartPie, Trophy, Warning, Users } from '@phosphor-icons/react';

interface CompetitorSOVProps {
  brandName: string;
  brandMentions: number;
  competitorMentions: Record<string, number>;
  totalIterations: number;
  configuredCompetitors: string[];
}

export function CompetitorSOV({
  brandName,
  brandMentions,
  competitorMentions,
  totalIterations,
  configuredCompetitors,
}: CompetitorSOVProps) {
  // Calculate SOV (Share of Voice)
  const sovData = useMemo(() => {
    if (totalIterations === 0) return [];

    const data: Array<{
      name: string;
      mentions: number;
      sov: number;
      isBrand: boolean;
    }> = [];

    // Add brand
    data.push({
      name: brandName,
      mentions: brandMentions,
      sov: (brandMentions / totalIterations) * 100,
      isBrand: true,
    });

    // Add only configured competitors
    for (const competitor of configuredCompetitors) {
      const mentions = competitorMentions[competitor] || 0;
      data.push({
        name: competitor,
        mentions,
        sov: (mentions / totalIterations) * 100,
        isBrand: false,
      });
    }

    // Sort by SOV descending
    return data.sort((a, b) => b.sov - a.sov);
  }, [brandName, brandMentions, competitorMentions, totalIterations, configuredCompetitors]);

  // Find brand rank
  const brandRank = sovData.findIndex(d => d.isBrand) + 1;
  const brandSov = sovData.find(d => d.isBrand)?.sov || 0;

  // Color palette for competitors
  const colors = [
    'bg-primary-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-orange-500',
    'bg-red-500',
    'bg-purple-500',
    'bg-pink-500',
  ];

  const getBrandStatusColor = () => {
    if (brandRank === 1) return 'text-green-400';
    if (brandRank <= 3) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (totalIterations === 0 || configuredCompetitors.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 h-full">
        <div className="flex items-center gap-2 mb-4">
          <ChartPie size={20} weight="duotone" className="text-primary-400" />
          <h3 className="text-base font-medium text-white/60">경쟁사 점유율 (SOV)</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Users size={48} weight="duotone" className="text-white/20 mb-3" />
          <p className="text-white/50 text-sm">
            {totalIterations === 0 ? '스캔 데이터가 없습니다' : '설정된 경쟁사가 없습니다'}
          </p>
          {configuredCompetitors.length === 0 && (
            <p className="text-white/30 text-xs mt-1">
              설정에서 경쟁사를 추가해주세요
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ChartPie size={20} weight="duotone" className="text-primary-400" />
          <h3 className="text-base font-medium text-white/60">경쟁사 점유율 (SOV)</h3>
        </div>
        <div className="flex items-center gap-2">
          <Trophy size={16} weight="fill" className={getBrandStatusColor()} />
          <span className={`text-sm font-medium ${getBrandStatusColor()}`}>
            {brandRank}위 / {sovData.length}
          </span>
        </div>
      </div>

      {/* Brand Status Summary */}
      <div className="mb-4 p-3 rounded-lg bg-white/5 flex items-center justify-between">
        <div>
          <span className="text-sm text-white/70">{brandName}</span>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-2xl font-bold ${getBrandStatusColor()}`}>
              {brandSov.toFixed(1)}%
            </span>
            {brandRank > 1 && (
              <span className="text-xs text-white/40">
                (1위와 {(sovData[0].sov - brandSov).toFixed(1)}%p 차이)
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs text-white/40">언급 횟수</span>
          <div className="text-lg font-semibold text-white/80">
            {brandMentions.toLocaleString()}회
          </div>
        </div>
      </div>

      {/* SOV Bar Chart */}
      <div className="space-y-3">
        {sovData.map((item, index) => (
          <div key={item.name} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {item.isBrand && (
                  <span className="text-xs bg-primary-500/20 text-primary-400 px-1.5 py-0.5 rounded">
                    내 브랜드
                  </span>
                )}
                <span className={item.isBrand ? 'text-white font-medium' : 'text-white/70'}>
                  {item.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/40 text-xs">{item.mentions.toLocaleString()}회</span>
                <span className={`font-medium ${item.isBrand ? 'text-primary-400' : 'text-white/80'}`}>
                  {item.sov.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${item.isBrand ? 'bg-primary-500' : colors[index % colors.length]}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(item.sov, 100)}%` }}
                transition={{ duration: 0.8, delay: index * 0.1, ease: 'easeOut' }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Warning if brand is behind */}
      {brandRank > 1 && (
        <div className="mt-4 p-3 rounded-lg bg-orange-400/10 border border-orange-400/20 flex items-start gap-2">
          <Warning size={16} weight="fill" className="text-orange-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-orange-400/80">
            <strong>{sovData[0].name}</strong>이(가) AI 응답에서 더 자주 언급됩니다. 
            콘텐츠 최적화를 고려해보세요.
          </div>
        </div>
      )}
    </div>
  );
}
