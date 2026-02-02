'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import {
  ArrowLeft,
  ArrowClockwise,
  CheckCircle,
  XCircle,
  Clock,
  CircleNotch,
  Star,
  Warning,
  Lightbulb,
  Target,
  Users,
  ChartBar,
  Info,
  CaretDown,
  Copy,
  Check,
  Eye,
  EyeSlash,
  Sparkle,
  TrendUp,
  TrendDown,
  Minus,
  Brain,
  MagnifyingGlass,
  ShareNetwork,
} from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import type { Scan, Brand, ScanQuery, ScanResult, Insight, ProviderType, ScanStatus } from '@/types/database';

interface ScanWithRelations extends Scan {
  brands: Brand;
  scan_queries: ScanQuery[];
  scan_results: ScanResult[];
  insights: Insight[];
}

interface ScanResultsProps {
  scan: ScanWithRelations;
}

const PROVIDER_INFO: Record<ProviderType, { name: string; color: string; icon: React.ReactNode; category: 'ai' | 'search' }> = {
  gemini: { name: 'Gemini', color: '#4285F4', icon: <Sparkle weight="fill" />, category: 'ai' },
  openai: { name: 'ChatGPT', color: '#10A37F', icon: <Brain weight="fill" />, category: 'ai' },
  anthropic: { name: 'Claude', color: '#D97706', icon: <Brain weight="fill" />, category: 'ai' },
  grok: { name: 'Grok', color: '#1DA1F2', icon: <Brain weight="fill" />, category: 'ai' },
  perplexity: { name: 'Perplexity', color: '#6366F1', icon: <MagnifyingGlass weight="fill" />, category: 'search' },
  google_search: { name: 'Google', color: '#EA4335', icon: <MagnifyingGlass weight="fill" />, category: 'search' },
};

const STATUS_CONFIG: Record<ScanStatus, { label: string; colorClass: string; icon: React.ReactNode }> = {
  pending: { label: '대기중', colorClass: 'bg-white/20 text-white/50', icon: <Clock weight="bold" /> },
  processing: { label: '처리중', colorClass: 'bg-blue-400/20 text-blue-400', icon: <CircleNotch weight="bold" className="animate-spin" /> },
  completed: { label: '완료', colorClass: 'bg-green-400/20 text-green-400', icon: <CheckCircle weight="fill" /> },
  failed: { label: '실패', colorClass: 'bg-red-400/20 text-red-400', icon: <XCircle weight="fill" /> },
};

const DEFAULT_STATUS = { label: '알 수 없음', colorClass: 'bg-white/10 text-white/40', icon: <Clock weight="bold" /> };
const DEFAULT_PROVIDER = { name: 'Unknown', color: '#666666', icon: '?', category: 'ai' as const };

// Sentiment badge component
function SentimentBadge({ sentiment }: { sentiment: 'positive' | 'neutral' | 'negative' | null }) {
  if (!sentiment) return null;

  const config = {
    positive: { label: '긍정', className: 'bg-green-500/20 text-green-400 border-green-500/30', icon: <TrendUp weight="bold" /> },
    neutral: { label: '중립', className: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: <Minus weight="bold" /> },
    negative: { label: '부정', className: 'bg-red-500/20 text-red-400 border-red-500/30', icon: <TrendDown weight="bold" /> },
  };

  const { label, className, icon } = config[sentiment];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border ${className}`}>
      {icon}
      {label}
    </span>
  );
}

// Prominence badge component
function ProminenceBadge({ prominence, position }: { prominence?: string; position?: number | null }) {
  if (!prominence || prominence === 'none') return null;

  const config: Record<string, { label: string; className: string }> = {
    primary: { label: '주요', className: 'bg-primary-500/20 text-primary-400 border-primary-500/30' },
    secondary: { label: '추천', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    mentioned: { label: '언급', className: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  };

  const { label, className } = config[prominence] || config.mentioned;

  return (
    <div className="flex items-center gap-1.5">
      <span className={`px-2 py-0.5 text-xs rounded-full border ${className}`}>
        {label}
      </span>
      {position && (
        <span className="text-xs text-white/40 font-mono">
          #{position}
        </span>
      )}
    </div>
  );
}

// Animated score gauge component
function ScoreGauge({ score, label, size = 'large', showTrend = false, previousScore }: {
  score: number;
  label: string;
  size?: 'large' | 'medium' | 'small';
  showTrend?: boolean;
  previousScore?: number;
}) {
  const getScoreColor = (score: number) => {
    if (score >= 70) return '#22C55E';
    if (score >= 40) return '#F59E0B';
    return '#EF4444';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return '우수';
    if (score >= 60) return '양호';
    if (score >= 40) return '보통';
    if (score >= 20) return '미흡';
    return '낮음';
  };

  const color = getScoreColor(score);
  const trend = showTrend && previousScore !== undefined ? score - previousScore : null;

  const sizeConfig = {
    large: { width: 140, strokeWidth: 10, radius: 55, fontSize: 'text-4xl', labelSize: 'text-sm' },
    medium: { width: 100, strokeWidth: 8, radius: 40, fontSize: 'text-2xl', labelSize: 'text-xs' },
    small: { width: 56, strokeWidth: 4, radius: 22, fontSize: 'text-sm', labelSize: 'text-[10px]' },
  };

  const { width, strokeWidth, radius, fontSize, labelSize } = sizeConfig[size];
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const center = width / 2;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width, height: width }}>
        <svg className="-rotate-90" style={{ width, height: width }}>
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-white/10"
          />
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className={`font-bold ${fontSize}`}
            style={{ color }}
          >
            {score}
          </motion.span>
          {size === 'large' && (
            <span className="text-xs text-white/40">{getScoreLabel(score)}</span>
          )}
        </div>
      </div>
      <span className={`mt-1 text-white/60 ${labelSize}`}>{label}</span>
      {trend !== null && trend !== 0 && (
        <span className={`flex items-center gap-0.5 text-xs ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
          {trend > 0 ? <TrendUp weight="bold" /> : <TrendDown weight="bold" />}
          {Math.abs(trend)}
        </span>
      )}
    </div>
  );
}

// Metric card component
function MetricCard({ label, value, subValue, icon, trend, color }: {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  color?: string;
}) {
  const trendIcon = trend === 'up' ? <TrendUp weight="bold" className="text-green-400" /> :
    trend === 'down' ? <TrendDown weight="bold" className="text-red-400" /> :
      trend === 'stable' ? <Minus weight="bold" className="text-white/40" /> : null;

  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-white/50">{label}</span>
        {icon && <span className="text-white/40">{icon}</span>}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold" style={{ color: color || 'white' }}>{value}</span>
        {subValue && <span className="text-sm text-white/40 mb-0.5">{subValue}</span>}
        {trendIcon && <span className="mb-1">{trendIcon}</span>}
      </div>
    </div>
  );
}

// Collapsible section component
function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = true,
  badge,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          {badge}
        </div>
        <CaretDown
          size={20}
          weight="bold"
          className={`text-white/50 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-4 pt-0 border-t border-white/5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Provider result card component
function ProviderResultCard({
  result,
  index,
  isExpanded,
  onToggle,
}: {
  result: ScanResult;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const info = PROVIDER_INFO[result.provider] || DEFAULT_PROVIDER;
  const prominence = (result as unknown as { mention_prominence?: string }).mention_prominence;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-colors"
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between bg-gradient-to-r from-white/5 to-transparent">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{ backgroundColor: `${info.color}20`, color: info.color }}
          >
            {info.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium" style={{ color: info.color }}>
                {info.name}
              </span>
              <span className={`px-1.5 py-0.5 text-[10px] rounded ${info.category === 'ai' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                {info.category === 'ai' ? 'AI' : 'Search'}
              </span>
            </div>
            {result.response_time_ms && (
              <span className="text-xs text-white/40">
                {(result.response_time_ms / 1000).toFixed(1)}초
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {result.brand_mentioned ? (
            <>
              <ProminenceBadge prominence={prominence} position={result.mention_position} />
              <SentimentBadge sentiment={result.sentiment_score} />
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <Eye weight="fill" className="text-green-400" size={16} />
              </div>
            </>
          ) : (
            <>
              <span className="text-xs text-white/40">미발견</span>
              <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                <EyeSlash weight="fill" className="text-red-400" size={16} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 border-t border-white/5">
        <div className={`text-sm text-white/70 prose prose-invert prose-sm max-w-none 
          prose-headings:text-white/90 prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-2 
          prose-p:my-1.5 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-strong:text-white/90
          ${isExpanded ? '' : 'line-clamp-4'}`}
        >
          <ReactMarkdown>
            {result.content || result.error_message || '응답 없음'}
          </ReactMarkdown>
        </div>
        {(result.content?.length ?? 0) > 200 && (
          <button
            onClick={onToggle}
            className="flex items-center gap-1 text-sm text-primary-400 hover:text-primary-300 mt-3 transition-colors"
          >
            <CaretDown size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            {isExpanded ? '접기' : '전체 보기'}
          </button>
        )}
      </div>

      {/* Footer - Competitors & Metadata */}
      {(result.competitor_mentions && Object.keys(result.competitor_mentions).length > 0) && (
        <div className="px-4 pb-4 flex items-center gap-2 text-xs text-white/50">
          <Users size={12} />
          <span>경쟁사 언급:</span>
          {Object.entries(result.competitor_mentions).map(([name, count]) => (
            <span key={name} className="px-2 py-0.5 bg-white/10 rounded-full">
              {name} ({count as number})
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export function ScanResults({ scan: initialScan }: ScanResultsProps) {
  const router = useRouter();
  const [scan, setScan] = useState(initialScan);
  const [polling, setPolling] = useState(
    initialScan.status === 'pending' || initialScan.status === 'processing'
  );
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'ai' | 'search' | 'all'>('all');

  const toggleExpanded = (resultId: string) => {
    setExpandedResults((prev) => {
      const next = new Set(prev);
      if (next.has(resultId)) next.delete(resultId);
      else next.add(resultId);
      return next;
    });
  };

  const copyResults = async () => {
    const text = generateResultsSummary();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateResultsSummary = () => {
    const lines = [
      `# ${scan.brands.name} AI 가시성 분석 결과`,
      ``,
      `📊 분석 일시: ${new Date(scan.created_at).toLocaleString('ko-KR')}`,
      `🔍 검색 쿼리: ${scan.scan_queries[0]?.query_text || 'N/A'}`,
      ``,
      `## 가시성 점수`,
      `- 총 점수: ${scan.visibility_score ?? 0}/100`,
      `- AI 점수: ${scan.ai_visibility_score ?? 0}/100`,
      `- SEO 점수: ${scan.seo_visibility_score ?? 0}/100`,
      `- 브랜드 언급: ${scan.scan_results.filter(r => r.brand_mentioned).length}/${scan.total_providers} 플랫폼`,
      ``,
      `## 플랫폼별 결과`,
      ...scan.scan_results.map(r => {
        const info = PROVIDER_INFO[r.provider] || DEFAULT_PROVIDER;
        const prominence = (r as unknown as { mention_prominence?: string }).mention_prominence;
        return `- ${info.name}: ${r.brand_mentioned ? `✅ 언급됨 (${prominence || '언급'}, ${r.sentiment_score || '중립'})` : '❌ 미언급'}`;
      }),
      ``,
      `## 인사이트`,
      ...scan.insights.map(i => `- [${i.insight_type}] ${i.title}: ${i.description}`),
    ];
    return lines.join('\n');
  };

  useEffect(() => {
    if (!polling) return;

    const interval = setInterval(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('scans')
        .select(`
          *,
          brands (*),
          scan_queries (*),
          scan_results (*),
          insights (*)
        `)
        .eq('id', scan.id)
        .single();

      if (data) {
        setScan(data as ScanWithRelations);
        if (data.status === 'completed' || data.status === 'failed') {
          setPolling(false);
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [polling, scan.id]);

  // Computed metrics
  const metrics = useMemo(() => {
    const results = scan.scan_results;
    const validResults = results.filter(r => r.status === 'success');
    const mentioned = validResults.filter(r => r.brand_mentioned);
    const positive = mentioned.filter(r => r.sentiment_score === 'positive');
    const negative = mentioned.filter(r => r.sentiment_score === 'negative');
    const aiResults = validResults.filter(r => PROVIDER_INFO[r.provider]?.category === 'ai');
    const searchResults = validResults.filter(r => PROVIDER_INFO[r.provider]?.category === 'search');
    const aiMentioned = aiResults.filter(r => r.brand_mentioned);
    const searchMentioned = searchResults.filter(r => r.brand_mentioned);

    return {
      total: validResults.length,
      mentioned: mentioned.length,
      notMentioned: validResults.length - mentioned.length,
      positive: positive.length,
      negative: negative.length,
      neutral: mentioned.length - positive.length - negative.length,
      aiTotal: aiResults.length,
      aiMentioned: aiMentioned.length,
      searchTotal: searchResults.length,
      searchMentioned: searchMentioned.length,
      avgResponseTime: validResults.length > 0
        ? Math.round(validResults.reduce((sum, r) => sum + (r.response_time_ms || 0), 0) / validResults.length / 1000 * 10) / 10
        : 0,
    };
  }, [scan.scan_results]);

  // Filter results by tab
  const filteredResults = useMemo(() => {
    if (activeTab === 'all') return scan.scan_results;
    return scan.scan_results.filter(r => {
      const info = PROVIDER_INFO[r.provider];
      return info?.category === activeTab;
    });
  }, [scan.scan_results, activeTab]);

  // Group insights
  const insights = useMemo(() => ({
    strengths: scan.insights.filter(i => i.insight_type === 'strength'),
    weaknesses: scan.insights.filter(i => i.insight_type === 'threat' || i.insight_type === 'improvement'),
    opportunities: scan.insights.filter(i => i.insight_type === 'opportunity'),
  }), [scan.insights]);

  const query = scan.scan_queries[0]?.query_text || '';
  const statusConfig = STATUS_CONFIG[scan.status] || DEFAULT_STATUS;

  return (
    <>
      {/* Header */}
      <header className="bg-white/5 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft size={16} weight="bold" />
              대시보드
            </button>
            <div className="flex items-center gap-2">
              {polling && (
                <div className="flex items-center gap-2 text-sm text-blue-400">
                  <CircleNotch size={16} weight="bold" className="animate-spin" />
                  분석 중...
                </div>
              )}
              {scan.status === 'completed' && (
                <button
                  onClick={copyResults}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  {copied ? <Check size={16} weight="bold" className="text-green-400" /> : <Copy size={16} weight="bold" />}
                  {copied ? '복사됨' : '복사'}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
        {/* Title & Status */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full ${statusConfig.colorClass}`}>
                {statusConfig.icon}
                {statusConfig.label}
              </span>
              <span className="text-sm text-white/50">{scan.brands.name}</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-white">&ldquo;{query}&rdquo;</h1>
            <p className="text-sm text-white/40 mt-1">
              {new Date(scan.created_at).toLocaleString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/scan/new?brand=${scan.brand_id}`)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
            >
              <ArrowClockwise size={16} weight="bold" />
              새 스캔
            </button>
          </div>
        </div>

        {/* Score Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Score */}
          <div className="bg-gradient-to-br from-primary-500/10 to-purple-500/10 backdrop-blur-xl rounded-2xl border border-white/10 p-6 flex flex-col items-center justify-center">
            <ScoreGauge score={scan.visibility_score ?? 0} label="AI 가시성 점수" size="large" />
          </div>

          {/* Sub Scores */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
            <h3 className="text-sm font-medium text-white/50 mb-4 flex items-center gap-2">
              <ChartBar weight="duotone" />
              세부 점수
            </h3>
            <div className="flex items-center justify-around">
              <ScoreGauge score={scan.ai_visibility_score ?? 0} label="AI 플랫폼" size="medium" />
              <div className="w-px h-16 bg-white/10" />
              <ScoreGauge score={scan.seo_visibility_score ?? 0} label="검색 엔진" size="medium" />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
            <h3 className="text-sm font-medium text-white/50 mb-4 flex items-center gap-2">
              <ShareNetwork weight="duotone" />
              분석 요약
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-white/5 rounded-xl">
                <div className="text-2xl font-bold text-white">
                  {metrics.mentioned}<span className="text-base text-white/30">/{metrics.total}</span>
                </div>
                <div className="text-xs text-white/50">브랜드 언급</div>
              </div>
              <div className="text-center p-3 bg-green-500/10 rounded-xl">
                <div className="text-2xl font-bold text-green-400">{metrics.positive}</div>
                <div className="text-xs text-white/50">긍정 언급</div>
              </div>
              <div className="text-center p-3 bg-red-500/10 rounded-xl">
                <div className="text-2xl font-bold text-red-400">{metrics.negative}</div>
                <div className="text-xs text-white/50">부정 언급</div>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-xl">
                <div className="text-2xl font-bold text-white">{metrics.avgResponseTime}s</div>
                <div className="text-xs text-white/50">평균 응답</div>
              </div>
            </div>
          </div>
        </div>

        {/* Provider Results */}
        <CollapsibleSection
          title="플랫폼별 결과"
          icon={<Brain size={20} weight="duotone" className="text-primary-400" />}
          badge={
            <span className="px-2 py-0.5 text-xs bg-white/10 rounded-full text-white/60">
              {metrics.mentioned}/{metrics.total} 언급
            </span>
          }
          defaultOpen={true}
        >
          {/* Tab filters */}
          <div className="flex gap-2 mb-4 mt-4">
            {(['all', 'ai', 'search'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${activeTab === tab
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
              >
                {tab === 'all' ? '전체' : tab === 'ai' ? `AI (${metrics.aiMentioned}/${metrics.aiTotal})` : `검색 (${metrics.searchMentioned}/${metrics.searchTotal})`}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredResults.length > 0 ? (
              filteredResults.map((result, index) => (
                <ProviderResultCard
                  key={result.id}
                  result={result}
                  index={index}
                  isExpanded={expandedResults.has(result.id)}
                  onToggle={() => toggleExpanded(result.id)}
                />
              ))
            ) : polling ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CircleNotch size={40} weight="bold" className="text-blue-400 animate-spin mb-3" />
                <p className="text-white/70">AI 플랫폼에서 응답을 수집하는 중...</p>
                <p className="text-sm text-white/40 mt-1">잠시만 기다려주세요</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Clock size={40} weight="duotone" className="text-white/20 mb-3" />
                <p className="text-white/50">결과가 없습니다</p>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Insights */}
        {scan.insights.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {insights.strengths.length > 0 && (
              <CollapsibleSection
                title="강점"
                icon={<Star size={20} weight="duotone" className="text-green-400" />}
                badge={<span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full">{insights.strengths.length}</span>}
                defaultOpen={true}
              >
                <ul className="space-y-3 mt-4">
                  {insights.strengths.map((insight) => (
                    <li key={insight.id} className="flex gap-3 p-3 bg-green-500/5 rounded-lg border border-green-500/10">
                      <CheckCircle size={18} weight="fill" className="text-green-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-white">{insight.title}</p>
                        <p className="text-xs text-white/60 mt-1">{insight.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CollapsibleSection>
            )}

            {insights.weaknesses.length > 0 && (
              <CollapsibleSection
                title="개선점"
                icon={<Warning size={20} weight="duotone" className="text-yellow-400" />}
                badge={<span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded-full">{insights.weaknesses.length}</span>}
                defaultOpen={true}
              >
                <ul className="space-y-3 mt-4">
                  {insights.weaknesses.map((insight) => (
                    <li key={insight.id} className="flex gap-3 p-3 bg-yellow-500/5 rounded-lg border border-yellow-500/10">
                      <Warning size={18} weight="fill" className="text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-white">{insight.title}</p>
                        <p className="text-xs text-white/60 mt-1">{insight.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CollapsibleSection>
            )}

            {insights.opportunities.length > 0 && (
              <CollapsibleSection
                title="기회"
                icon={<Lightbulb size={20} weight="duotone" className="text-primary-400" />}
                badge={<span className="px-2 py-0.5 text-xs bg-primary-500/20 text-primary-400 rounded-full">{insights.opportunities.length}</span>}
                defaultOpen={true}
              >
                <ul className="space-y-3 mt-4">
                  {insights.opportunities.map((insight) => (
                    <li key={insight.id} className="flex gap-3 p-3 bg-primary-500/5 rounded-lg border border-primary-500/10">
                      <Lightbulb size={18} weight="fill" className="text-primary-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-white">{insight.title}</p>
                        <p className="text-xs text-white/60 mt-1">{insight.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CollapsibleSection>
            )}
          </div>
        )}

        {/* AEO Tips for completed scans without insights */}
        {scan.status === 'completed' && scan.insights.length === 0 && (
          <CollapsibleSection
            title="AEO 최적화 팁"
            icon={<Info size={20} weight="duotone" className="text-blue-400" />}
            defaultOpen={true}
          >
            <div className="mt-4 space-y-3">
              {[
                { icon: <Target size={18} />, text: 'FAQ 페이지에 Schema.org 구조화된 데이터를 추가하여 AI가 정보를 쉽게 인식하도록 하세요.' },
                { icon: <Target size={18} />, text: '브랜드의 핵심 가치와 차별점을 명확하게 설명하는 콘텐츠를 최적화하세요.' },
                { icon: <Target size={18} />, text: '정기적으로 AI 가시성을 모니터링하고 경쟁사 대비 순위 변화를 추적하세요.' },
              ].map((tip, i) => (
                <div key={i} className="flex gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <span className="text-blue-400 flex-shrink-0">{tip.icon}</span>
                  <p className="text-sm text-white/70">{tip.text}</p>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}
      </main>
    </>
  );
}
