'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { TrendUp, TrendDown, Minus, ChartLine } from '@phosphor-icons/react';
import type { TrendData, TrendPeriod } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';

interface TrendChartProps {
  trends: {
    overall: TrendData;
    providers?: Record<string, TrendData>;
  } | undefined;
  isLoading: boolean;
  onPeriodChange?: (period: TrendPeriod) => void;
  selectedPeriod?: TrendPeriod;
}

const PERIOD_OPTIONS: { value: TrendPeriod; label: string }[] = [
  { value: '7d', label: '7일' },
  { value: '30d', label: '30일' },
  { value: '90d', label: '90일' },
];

export function TrendChart({ trends, isLoading, onPeriodChange, selectedPeriod = '7d' }: TrendChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!trends?.overall) {
    return (
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-2 text-white/60 mb-4">
          <ChartLine size={20} weight="duotone" />
          <h3 className="font-medium">가시성 추이</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-white/40">
          <ChartLine size={48} weight="thin" />
          <p className="mt-2 text-sm">데이터가 충분하지 않습니다</p>
          <p className="text-xs">스캔을 더 실행하면 추이를 확인할 수 있습니다</p>
        </div>
      </div>
    );
  }

  const { overall } = trends;
  const { dataPoints, direction, changePercent, current, previous } = overall;

  // Calculate chart dimensions
  const maxScore = Math.max(...dataPoints.map(d => d.score), 100);
  const minScore = Math.min(...dataPoints.filter(d => d.score > 0).map(d => d.score), 0);
  const range = maxScore - minScore || 100;

  const getTrendIcon = () => {
    switch (direction) {
      case 'up':
        return <TrendUp size={16} weight="bold" className="text-green-400" />;
      case 'down':
        return <TrendDown size={16} weight="bold" className="text-red-400" />;
      default:
        return <Minus size={16} weight="bold" className="text-white/40" />;
    }
  };

  const getTrendColor = () => {
    switch (direction) {
      case 'up':
        return 'text-green-400';
      case 'down':
        return 'text-red-400';
      default:
        return 'text-white/40';
    }
  };

  const getLineColor = () => {
    switch (direction) {
      case 'up':
        return '#4ade80';
      case 'down':
        return '#f87171';
      default:
        return '#94a3b8';
    }
  };

  // Generate SVG path for the line
  const chartWidth = 280;
  const chartHeight = 80;
  const padding = 10;

  const points = dataPoints.map((d, i) => {
    const x = padding + (i / (dataPoints.length - 1 || 1)) * (chartWidth - padding * 2);
    const y = chartHeight - padding - ((d.score - minScore) / range) * (chartHeight - padding * 2);
    return { x, y, score: d.score, date: d.date };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-white/60">
          <ChartLine size={20} weight="duotone" />
          <h3 className="font-medium">가시성 추이</h3>
        </div>
        
        {/* Period Selector */}
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onPeriodChange?.(option.value)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                selectedPeriod === option.value
                  ? 'bg-orange-500 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-white">{current}</span>
          <span className="text-white/40 text-sm">점</span>
        </div>
        <div className={`flex items-center gap-1 ${getTrendColor()}`}>
          {getTrendIcon()}
          <span className="text-sm font-medium">
            {changePercent > 0 ? '+' : ''}{changePercent}%
          </span>
        </div>
        <span className="text-xs text-white/40">
          이전: {previous}점
        </span>
      </div>

      {/* Chart */}
      <div className="relative">
        <svg
          width="100%"
          height={chartHeight}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="none"
          className="overflow-visible"
        >
          {/* Gradient fill */}
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={getLineColor()} stopOpacity="0.3" />
              <stop offset="100%" stopColor={getLineColor()} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Area fill */}
          <motion.path
            d={areaPath}
            fill="url(#areaGradient)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          />

          {/* Line */}
          <motion.path
            d={linePath}
            fill="none"
            stroke={getLineColor()}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8 }}
          />

          {/* Data points */}
          {points.map((point, i) => (
            <g key={i}>
              <circle
                cx={point.x}
                cy={point.y}
                r={hoveredIndex === i ? 6 : 4}
                fill={getLineColor()}
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
              {hoveredIndex === i && (
                <g>
                  <rect
                    x={point.x - 30}
                    y={point.y - 35}
                    width="60"
                    height="28"
                    rx="4"
                    fill="rgba(0,0,0,0.8)"
                  />
                  <text
                    x={point.x}
                    y={point.y - 22}
                    textAnchor="middle"
                    fill="white"
                    fontSize="10"
                  >
                    {point.score}점
                  </text>
                  <text
                    x={point.x}
                    y={point.y - 10}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="8"
                  >
                    {new Date(point.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                  </text>
                </g>
              )}
            </g>
          ))}
        </svg>
      </div>

      {/* Date labels */}
      <div className="flex justify-between mt-2 text-xs text-white/40">
        <span>{new Date(dataPoints[0]?.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
        <span>{new Date(dataPoints[dataPoints.length - 1]?.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  );
}
