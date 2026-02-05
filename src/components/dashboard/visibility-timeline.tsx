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

interface TimelineDataPoint {
  date: string;
  overallScore: number;
  aiScore: number;
  seoScore: number;
  events?: TimelineEvent[];
}

interface TimelineEvent {
  id: string;
  date: string;
  type: 'content_published' | 'campaign_started' | 'competitor_action' | 'algorithm_update' | 'seo_update' | 'pr_mention' | 'social_campaign';
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
};

export function VisibilityTimeline({
  data,
  events = [],
  period = '30d',
  onPeriodChange,
  isLoading = false,
}: VisibilityTimelineProps) {
  const [selectedMetric, setSelectedMetric] = useState<'overall' | 'ai' | 'seo'>('overall');
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  // Calculate trend
  const calculateTrend = () => {
    if (data.length < 2) return { direction: 'stable' as const, change: 0 };
    const firstScore = data[0]?.overallScore || 0;
    const lastScore = data[data.length - 1]?.overallScore || 0;
    const change = lastScore - firstScore;
    const changePercent = firstScore > 0 ? Math.round((change / firstScore) * 100) : 0;
    
    let direction: 'up' | 'down' | 'stable' = 'stable';
    if (Math.abs(changePercent) >= 5) {
      direction = change > 0 ? 'up' : 'down';
    }
    
    return { direction, change: changePercent };
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

  // Get score based on selected metric
  const getScore = (point: TimelineDataPoint) => {
    switch (selectedMetric) {
      case 'ai':
        return point.aiScore;
      case 'seo':
        return point.seoScore;
      default:
        return point.overallScore;
    }
  };

  // Calculate chart dimensions
  const chartHeight = 160;
  const maxScore = Math.max(...data.map(d => Math.max(d.overallScore, d.aiScore, d.seoScore)), 100);
  const minScore = Math.min(...data.map(d => Math.min(d.overallScore, d.aiScore, d.seoScore)), 0);
  const scoreRange = maxScore - minScore || 1;

  // Generate path for line chart
  const generatePath = (metric: 'overall' | 'ai' | 'seo') => {
    if (data.length === 0) return '';
    
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1 || 1)) * 100;
      const score = metric === 'ai' ? d.aiScore : metric === 'seo' ? d.seoScore : d.overallScore;
      const y = chartHeight - ((score - minScore) / scoreRange) * chartHeight;
      return `${x},${y}`;
    });
    
    return `M${points.join(' L')}`;
  };

  if (isLoading) {
    return (
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-2 mb-4">
          <ChartLine size={20} weight="duotone" className="text-primary-400" />
          <h3 className="text-base font-medium text-white/60">가시성 추이</h3>
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
          <h3 className="text-base font-medium text-white/60">가시성 추이</h3>
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
          <h3 className="text-base font-medium text-white/60">가시성 추이</h3>
          <div className="flex items-center gap-1 ml-2">
            {getTrendIcon()}
            <span className={`text-sm font-medium ${
              trend.direction === 'up' ? 'text-green-400' :
              trend.direction === 'down' ? 'text-red-400' : 'text-white/40'
            }`}>
              {trend.change > 0 ? '+' : ''}{trend.change}%
            </span>
          </div>
        </div>
        
        {/* Period selector */}
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
          {PERIOD_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => onPeriodChange?.(option.value)}
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
      </div>

      {/* Metric selector */}
      <div className="flex items-center gap-4 mb-4">
        {[
          { key: 'overall' as const, label: '종합', color: 'bg-primary-500' },
          { key: 'ai' as const, label: 'AI', color: 'bg-blue-500' },
          { key: 'seo' as const, label: 'SEO', color: 'bg-green-500' },
        ].map(metric => (
          <button
            key={metric.key}
            onClick={() => setSelectedMetric(metric.key)}
            className={`flex items-center gap-2 text-sm transition-opacity ${
              selectedMetric === metric.key ? 'opacity-100' : 'opacity-40 hover:opacity-70'
            }`}
          >
            <div className={`w-3 h-3 rounded-full ${metric.color}`} />
            <span className="text-white/80">{metric.label}</span>
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="relative h-48">
        <svg
          viewBox={`0 0 100 ${chartHeight}`}
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(pct => (
            <line
              key={pct}
              x1="0"
              y1={chartHeight - (pct / 100) * chartHeight}
              x2="100"
              y2={chartHeight - (pct / 100) * chartHeight}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="0.2"
            />
          ))}

          {/* Lines */}
          {selectedMetric === 'overall' || true ? (
            <motion.path
              d={generatePath('overall')}
              fill="none"
              stroke={selectedMetric === 'overall' ? '#FF8C42' : 'rgba(255,140,66,0.3)'}
              strokeWidth={selectedMetric === 'overall' ? '0.8' : '0.4'}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          ) : null}

          {/* Data points */}
          {data.map((point, i) => {
            const x = (i / (data.length - 1 || 1)) * 100;
            const score = getScore(point);
            const y = chartHeight - ((score - minScore) / scoreRange) * chartHeight;
            const hasEvent = events.some(e => e.date === point.date);
            
            return (
              <g key={i}>
                <motion.circle
                  cx={x}
                  cy={y}
                  r={hoveredPoint === i ? '2' : '1.5'}
                  fill={selectedMetric === 'overall' ? '#FF8C42' : selectedMetric === 'ai' ? '#3B82F6' : '#22C55E'}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.02 }}
                  onMouseEnter={() => setHoveredPoint(i)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  className="cursor-pointer"
                />
                {hasEvent && (
                  <circle
                    cx={x}
                    cy={chartHeight - 2}
                    r="1"
                    fill="#EAB308"
                  />
                )}
              </g>
            );
          })}
        </svg>

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
              <span className="text-primary-400 font-bold">{data[hoveredPoint].overallScore}</span>
              <span className="text-white/40">종합</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-400 font-bold">{data[hoveredPoint].aiScore}</span>
              <span className="text-white/40">AI</span>
              <span className="text-green-400 font-bold ml-2">{data[hoveredPoint].seoScore}</span>
              <span className="text-white/40">SEO</span>
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
