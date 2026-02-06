'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ChartLine, 
  TrendUp, 
  TrendDown, 
  Minus,
  CalendarBlank,
  Flag,
  Info,
} from '@phosphor-icons/react';

// Legacy data point format (for backwards compatibility)
interface LegacyTimelineDataPoint {
  date: string;
  overallScore: number;
  aiScore: number;
  seoScore: number;
  events?: TimelineEvent[];
}

// New exposure data point format
interface ExposureDataPoint {
  date: string;
  exposureRate: number;
  questionSetId?: string;
}

type TimelineDataPoint = LegacyTimelineDataPoint | ExposureDataPoint;

interface TimelineEvent {
  id: string;
  date: string;
  type: 'content_published' | 'campaign_started' | 'competitor_action' | 'algorithm_update' | 'seo_update' | 'pr_mention' | 'social_campaign' | 'scan_completed';
  title: string;
  description?: string;
  impact: 'positive' | 'negative' | 'neutral';
}

interface VisibilityTimelineProps {
  data: TimelineDataPoint[];
  events?: TimelineEvent[];
  period?: '7d' | '30d' | '90d';
  onPeriodChange?: (period: '7d' | '30d' | '90d') => void;
  isLoading?: boolean;
  mode?: 'score' | 'exposure'; // 'exposure' for new batch scan format
}

const PERIOD_OPTIONS = [
  { value: '7d' as const, label: '7일' },
  { value: '30d' as const, label: '30일' },
  { value: '90d' as const, label: '90일' },
];

const EVENT_TYPE_STYLES: Record<string, { color: string; label: string }> = {
  content_published: { color: 'bg-blue-500', label: '콘텐츠 게시' },
  campaign_started: { color: 'bg-purple-500', label: '캠페인 시작' },
  competitor_action: { color: 'bg-orange-500', label: '경쟁사 활동' },
  algorithm_update: { color: 'bg-red-500', label: '알고리즘 변경' },
  seo_update: { color: 'bg-green-500', label: 'SEO 업데이트' },
  pr_mention: { color: 'bg-cyan-500', label: 'PR 언급' },
  social_campaign: { color: 'bg-pink-500', label: '소셜 캠페인' },
  scan_completed: { color: 'bg-primary-500', label: '스캔 완료' },
};

// Type guard for exposure data
function isExposureData(data: TimelineDataPoint[]): data is ExposureDataPoint[] {
  return data.length > 0 && 'exposureRate' in data[0];
}

export function VisibilityTimeline({
  data,
  events = [],
  period = '30d',
  onPeriodChange,
  isLoading = false,
  mode = 'score',
}: VisibilityTimelineProps) {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  // Detect mode from data if not explicitly set
  const effectiveMode = mode === 'exposure' || isExposureData(data) ? 'exposure' : 'score';

  // Get value based on mode
  const getValue = (point: TimelineDataPoint): number => {
    if ('exposureRate' in point) {
      return point.exposureRate;
    }
    return point.overallScore;
  };

  // Calculate trend
  const calculateTrend = (): { direction: 'up' | 'down' | 'stable'; change: number; absoluteChange: number } => {
    if (data.length < 2) return { direction: 'stable', change: 0, absoluteChange: 0 };
    const firstValue = getValue(data[0]);
    const lastValue = getValue(data[data.length - 1]);
    const change = lastValue - firstValue;
    const changePercent = firstValue > 0 ? Math.round((change / firstValue) * 100) : 0;
    
    let direction: 'up' | 'down' | 'stable' = 'stable';
    if (Math.abs(changePercent) >= 5) {
      direction = change > 0 ? 'up' : 'down';
    }
    
    return { direction, change: changePercent, absoluteChange: change };
  };

  const trend = calculateTrend();

  const getTrendIcon = () => {
    switch (trend.direction) {
      case 'up':
        return <TrendUp size={16} weight="bold" className="text-green-400" />;
      case 'down':
        return <TrendDown size={16} weight="bold" className="text-red-400" />;
      default:
        return <Minus size={16} weight="bold" className="text-white/40" />;
    }
  };

  // Calculate chart dimensions
  const chartHeight = 160;
  const values = data.map(getValue);
  const maxValue = Math.max(...values, effectiveMode === 'exposure' ? 100 : 100);
  const minValue = Math.min(...values, 0);
  const valueRange = maxValue - minValue || 1;

  // Generate path for line chart
  const generatePath = () => {
    if (data.length === 0) return '';
    
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1 || 1)) * 100;
      const value = getValue(d);
      const y = chartHeight - ((value - minValue) / valueRange) * chartHeight;
      return `${x},${y}`;
    });
    
    return `M${points.join(' L')}`;
  };

  // Generate area fill path
  const generateAreaPath = () => {
    if (data.length === 0) return '';
    
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1 || 1)) * 100;
      const value = getValue(d);
      const y = chartHeight - ((value - minValue) / valueRange) * chartHeight;
      return `${x},${y}`;
    });
    
    return `M0,${chartHeight} L${points.join(' L')} L100,${chartHeight} Z`;
  };

  if (isLoading) {
    return (
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-2 mb-4">
          <ChartLine size={20} weight="duotone" className="text-primary-400" />
          <h3 className="text-base font-medium text-white/60">
            {effectiveMode === 'exposure' ? 'AI 가시성 노출도 추이' : '가시성 추이'}
          </h3>
        </div>
        <div className="h-48 bg-white/5 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-2 mb-4">
          <ChartLine size={20} weight="duotone" className="text-primary-400" />
          <h3 className="text-base font-medium text-white/60">
            {effectiveMode === 'exposure' ? 'AI 가시성 노출도 추이' : '가시성 추이'}
          </h3>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Info size={32} weight="duotone" className="text-white/20 mb-2" />
          <p className="text-sm text-white/50">아직 추이 데이터가 없습니다</p>
          <p className="text-xs text-white/40 mt-1">스캔을 실행하여 데이터를 수집하세요</p>
        </div>
      </div>
    );
  }

  return (
    <div id="visibility-timeline" className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ChartLine size={20} weight="duotone" className="text-primary-400" />
          <h3 className="text-base font-medium text-white/60">
            {effectiveMode === 'exposure' ? 'AI 가시성 노출도 추이' : '가시성 추이'}
          </h3>
          <div className="flex items-center gap-1 ml-2">
            {getTrendIcon()}
            <span className={`text-sm font-medium ${
              trend.direction === 'up' ? 'text-green-400' :
              trend.direction === 'down' ? 'text-red-400' : 'text-white/40'
            }`}>
              {trend.absoluteChange > 0 ? '+' : ''}{trend.absoluteChange.toFixed(1)}%p
            </span>
          </div>
        </div>
        
        {/* Period selector */}
        {onPeriodChange && (
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
            {PERIOD_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => onPeriodChange(option.value)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  period === option.value
                    ? 'bg-primary-500 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      {effectiveMode === 'exposure' && (
        <div className="flex items-center gap-4 mb-4 text-xs text-white/50">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-primary-500 rounded" />
            <span>노출도 (%)</span>
          </div>
          <span className="text-white/30">|</span>
          <span>최근 {period === '7d' ? '7일' : period === '30d' ? '30일' : '90일'} 스캔 기준</span>
        </div>
      )}

      {/* Chart */}
      <div className="relative h-48">
        <svg
          viewBox={`0 0 100 ${chartHeight}`}
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(pct => (
            <g key={pct}>
              <line
                x1="0"
                y1={chartHeight - (pct / 100) * chartHeight}
                x2="100"
                y2={chartHeight - (pct / 100) * chartHeight}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="0.2"
              />
            </g>
          ))}

          {/* Area fill */}
          <motion.path
            d={generateAreaPath()}
            fill="url(#areaGradient)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          />

          {/* Line */}
          <motion.path
            d={generatePath()}
            fill="none"
            stroke="#FF8C42"
            strokeWidth="0.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />

          {/* Gradient definition */}
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF8C42" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#FF8C42" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Data points */}
          {data.map((point, i) => {
            const x = (i / (data.length - 1 || 1)) * 100;
            const value = getValue(point);
            const y = chartHeight - ((value - minValue) / valueRange) * chartHeight;
            
            return (
              <g key={i}>
                <motion.circle
                  cx={x}
                  cy={y}
                  r={hoveredPoint === i ? '2' : '1.5'}
                  fill="#FF8C42"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.02 }}
                  onMouseEnter={() => setHoveredPoint(i)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  className="cursor-pointer"
                />
              </g>
            );
          })}
        </svg>

        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-white/30 -ml-8 w-6 text-right">
          <span>100%</span>
          <span>75%</span>
          <span>50%</span>
          <span>25%</span>
          <span>0%</span>
        </div>

        {/* Tooltip */}
        {hoveredPoint !== null && data[hoveredPoint] && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bg-gray-900 border border-white/20 rounded-lg px-3 py-2 text-xs shadow-xl z-10"
            style={{
              left: `${(hoveredPoint / (data.length - 1 || 1)) * 100}%`,
              top: 0,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="flex items-center gap-1 text-white/60 mb-1">
              <CalendarBlank size={12} />
              <span>{new Date(data[hoveredPoint].date).toLocaleDateString('ko-KR')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-primary-400 font-bold">
                {getValue(data[hoveredPoint]).toFixed(1)}%
              </span>
              <span className="text-white/40">
                {effectiveMode === 'exposure' ? '노출도' : '가시성'}
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Events timeline */}
      {events.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Flag size={14} weight="duotone" className="text-white/40" />
            <span className="text-xs font-medium text-white/40">주요 이벤트</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {events.slice(0, 5).map(event => (
              <div
                key={event.id}
                className="flex items-center gap-2 px-2 py-1 bg-white/5 rounded-lg text-xs"
              >
                <div className={`w-2 h-2 rounded-full ${EVENT_TYPE_STYLES[event.type]?.color || 'bg-gray-500'}`} />
                <span className="text-white/60">{event.title}</span>
                <span className="text-white/30">
                  {new Date(event.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
