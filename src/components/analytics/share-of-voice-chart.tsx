'use client';

import { motion } from 'motion/react';
import { Users, Trophy, TrendUp, TrendDown, Minus } from '@phosphor-icons/react';
import { Skeleton } from '@/components/ui/skeleton';

interface SOVEntity {
  name: string;
  percentage: number;
  mentionsCount: number;
  visibilityScore?: number;
  isBrand: boolean;
}

interface ShareOfVoiceChartProps {
  brand: SOVEntity | undefined;
  competitors: SOVEntity[];
  isLoading: boolean;
}

const COLORS = [
  '#f97316', // Brand - Orange
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#84cc16', // Lime
  '#f59e0b', // Amber
  '#6366f1', // Indigo
];

export function ShareOfVoiceChart({ brand, competitors, isLoading }: ShareOfVoiceChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-32 w-32 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-2 text-white/60 mb-4">
          <Users size={20} weight="duotone" />
          <h3 className="font-medium">점유율 (Share of Voice)</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-white/40">
          <Users size={48} weight="thin" />
          <p className="mt-2 text-sm">데이터가 없습니다</p>
        </div>
      </div>
    );
  }

  // Combine brand and competitors for display
  const allEntities = [{ ...brand, color: COLORS[0] }, ...competitors.map((c, i) => ({ ...c, color: COLORS[(i + 1) % COLORS.length] }))];
  
  // Sort by percentage descending
  allEntities.sort((a, b) => b.percentage - a.percentage);
  
  // Find brand rank
  const brandRank = allEntities.findIndex(e => e.isBrand) + 1;

  // Calculate total for pie chart
  const total = allEntities.reduce((sum, e) => sum + e.percentage, 0);
  
  // Generate pie chart segments
  let currentAngle = -90; // Start from top
  const segments = allEntities.map(entity => {
    const angle = (entity.percentage / (total || 100)) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;
    
    // Calculate arc path
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = ((startAngle + angle) * Math.PI) / 180;
    const largeArc = angle > 180 ? 1 : 0;
    
    const radius = 50;
    const cx = 60;
    const cy = 60;
    
    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);
    
    return {
      ...entity,
      path: `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`,
    };
  });

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-white/60">
          <Users size={20} weight="duotone" />
          <h3 className="font-medium">점유율 (Share of Voice)</h3>
        </div>
        {brandRank === 1 && (
          <div className="flex items-center gap-1 text-yellow-400 text-sm">
            <Trophy size={16} weight="fill" />
            <span>1위</span>
          </div>
        )}
      </div>

      <div className="flex gap-6">
        {/* Pie Chart */}
        <div className="relative w-[120px] h-[120px] flex-shrink-0">
          <svg viewBox="0 0 120 120" className="w-full h-full">
            {segments.map((segment, i) => (
              <motion.path
                key={segment.name}
                d={segment.path}
                fill={segment.color}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1, duration: 0.3 }}
                className="cursor-pointer hover:opacity-80"
              />
            ))}
            {/* Center hole */}
            <circle cx="60" cy="60" r="30" fill="rgba(0,0,0,0.5)" />
            {/* Brand percentage in center */}
            <text
              x="60"
              y="56"
              textAnchor="middle"
              fill="white"
              fontSize="16"
              fontWeight="bold"
            >
              {brand.percentage}%
            </text>
            <text
              x="60"
              y="72"
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="10"
            >
              내 브랜드
            </text>
          </svg>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2 overflow-y-auto max-h-[140px]">
          {allEntities.map((entity, i) => (
            <motion.div
              key={entity.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex items-center gap-2 ${entity.isBrand ? 'bg-orange-500/10 -mx-2 px-2 py-1 rounded-lg' : ''}`}
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: entity.color }}
              />
              <span className={`text-sm truncate flex-1 ${entity.isBrand ? 'text-white font-medium' : 'text-white/70'}`}>
                {entity.name}
                {entity.isBrand && ' (내 브랜드)'}
              </span>
              <span className={`text-sm font-medium ${entity.isBrand ? 'text-orange-400' : 'text-white/60'}`}>
                {entity.percentage}%
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Insights */}
      {brandRank > 1 && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2 text-sm text-white/60">
            <TrendDown size={14} className="text-yellow-400" />
            <span>
              현재 {brandRank}위입니다. 1위 {allEntities[0].name}와 {(allEntities[0].percentage - brand.percentage).toFixed(1)}%p 차이가 있습니다.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
