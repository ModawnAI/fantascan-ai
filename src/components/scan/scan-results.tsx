'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import {
  ArrowLeft,
  ArrowClockwise,
  CheckCircle,
  XCircle,
  Clock,
  CircleNotch,
  TrendUp,
  TrendDown,
  Star,
  Warning,
  Lightbulb,
  Target,
  Users,
  ChartBar,
  Info,
  CaretDown,
  Export,
  Copy,
  Check,
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

const PROVIDER_INFO: Record<ProviderType, { name: string; color: string; icon: string }> = {
  gemini: { name: 'Gemini', color: '#4285F4', icon: '✦' },
  openai: { name: 'ChatGPT', color: '#10A37F', icon: '◯' },
  anthropic: { name: 'Claude', color: '#D97706', icon: '◈' },
  grok: { name: 'Grok', color: '#1DA1F2', icon: '✕' },
  perplexity: { name: 'Perplexity', color: '#6366F1', icon: '◎' },
  google_search: { name: 'Google', color: '#EA4335', icon: 'G' },
};

const STATUS_CONFIG: Record<ScanStatus, { label: string; colorClass: string }> = {
  pending: { label: '대기중', colorClass: 'bg-white/20 text-white/50' },
  processing: { label: '처리중', colorClass: 'bg-blue-400/20 text-blue-400' },
  completed: { label: '완료', colorClass: 'bg-green-400/20 text-green-400' },
  failed: { label: '실패', colorClass: 'bg-red-400/20 text-red-400' },
};

const DEFAULT_STATUS = { label: '알 수 없음', colorClass: 'bg-white/10 text-white/40' };
const DEFAULT_PROVIDER = { name: 'Unknown', color: '#666666', icon: '?' };

// Sentiment badge component
function SentimentBadge({ sentiment }: { sentiment: 'positive' | 'neutral' | 'negative' | null }) {
  if (!sentiment) return null;

  const config = {
    positive: { label: '긍정', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
    neutral: { label: '중립', className: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
    negative: { label: '부정', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
  };

  const { label, className } = config[sentiment];

  return (
    <span className={`px-2 py-0.5 text-xs rounded-full border ${className}`}>
      {label}
    </span>
  );
}

// Prominence badge component
function ProminenceBadge({ prominence, position }: { prominence?: string; position?: number | null }) {
  if (!prominence || prominence === 'none') return null;

  const config: Record<string, { label: string; className: string }> = {
    primary: { label: '주요 추천', className: 'bg-primary-500/20 text-primary-400 border-primary-500/30' },
    secondary: { label: '추천', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    mentioned: { label: '언급', className: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  };

  const { label, className } = config[prominence] || config.mentioned;

  return (
    <div className="flex items-center gap-2">
      <span className={`px-2 py-0.5 text-xs rounded-full border ${className}`}>
        {label}
      </span>
      {position && (
        <span className="text-xs text-white/50">
          #{position}위
        </span>
      )}
    </div>
  );
}

// Score gauge component
function ScoreGauge({ score, label, size = 'large' }: { score: number; label: string; size?: 'large' | 'small' }) {
  const getScoreColor = (score: number) => {
    if (score >= 70) return '#22C55E';
    if (score >= 40) return '#F59E0B';
    return '#EF4444';
  };

  const color = getScoreColor(score);
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  if (size === 'small') {
    return (
      <div className="flex items-center gap-2">
        <div className="relative w-10 h-10">
          <svg className="w-10 h-10 -rotate-90">
            <circle
              cx="20"
              cy="20"
              r="16"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              className="text-white/10"
            />
            <circle
              cx="20"
              cy="20"
              r="16"
              stroke={color}
              strokeWidth="3"
              fill="none"
              strokeDasharray={2 * Math.PI * 16}
              strokeDashoffset={2 * Math.PI * 16 - (score / 100) * 2 * Math.PI * 16}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color }}>
            {score}
          </span>
        </div>
        <span className="text-xs text-white/60">{label}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 -rotate-90">
          <circle
            cx="64"
            cy="64"
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-white/10"
          />
          <motion.circle
            cx="64"
            cy="64"
            r="45"
            stroke={color}
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'easeOut' }}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-4xl font-bold"
            style={{ color }}
          >
            {score}
          </motion.span>
          <span className="text-sm text-white/50">/100</span>
        </div>
      </div>
      <span className="mt-2 text-sm text-white/60">{label}</span>
    </div>
  );
}

// Collapsible section component
function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
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
        </div>
        <CaretDown
          size={20}
          weight="bold"
          className={`text-white/50 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <motion.div
        initial={false}
        animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div className="p-4 pt-0 border-t border-white/10">
          {children}
        </div>
      </motion.div>
    </div>
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

  const toggleExpanded = (resultId: string) => {
    setExpandedResults((prev) => {
      const next = new Set(prev);
      if (next.has(resultId)) {
        next.delete(resultId);
      } else {
        next.add(resultId);
      }
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
        return `- ${info.name}: ${r.brand_mentioned ? '✅ 언급됨' : '❌ 미언급'}${r.sentiment ? ` (${r.sentiment})` : ''}`;
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

  const query = scan.scan_queries[0]?.query_text || '';

  // Group insights by type
  const strengths = scan.insights.filter(i => i.insight_type === 'strength');
  const weaknesses = scan.insights.filter(i => i.insight_type === 'threat' || i.insight_type === 'improvement');
  const opportunities = scan.insights.filter(i => i.insight_type === 'opportunity');
  const hasInsights = scan.insights.length > 0;

  // Calculate metrics
  const mentionedResults = scan.scan_results.filter(r => r.brand_mentioned);
  const positiveResults = scan.scan_results.filter(r => r.sentiment === 'positive');
  const negativeResults = scan.scan_results.filter(r => r.sentiment === 'negative');

  return (
    <>
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
                  처리중...
                </div>
              )}
              {scan.status === 'completed' && (
                <button
                  onClick={copyResults}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  {copied ? <Check size={16} weight="bold" className="text-green-400" /> : <Copy size={16} weight="bold" />}
                  {copied ? '복사됨!' : '결과 복사'}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Header Info */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 text-xs rounded ${(STATUS_CONFIG[scan.status] || DEFAULT_STATUS).colorClass}`}>
              {(STATUS_CONFIG[scan.status] || DEFAULT_STATUS).label}
            </span>
            <span className="text-sm text-white/50">
              {scan.brands.name}
            </span>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">&ldquo;{query}&rdquo;</h1>
          <p className="text-sm text-white/50">
            {new Date(scan.created_at).toLocaleString('ko-KR')}
          </p>
        </div>

        {/* Score Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Main Score */}
          <div className="md:col-span-1 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 flex flex-col items-center justify-center">
            <ScoreGauge score={scan.visibility_score ?? 0} label="AI 가시성 점수" />
          </div>

          {/* Metrics Grid */}
          <div className="md:col-span-2 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
            <h3 className="text-sm font-medium text-white/60 mb-4">분석 요약</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {mentionedResults.length}
                  <span className="text-lg text-white/40">/{scan.total_providers}</span>
                </div>
                <div className="text-xs text-white/50 mt-1">브랜드 언급</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{positiveResults.length}</div>
                <div className="text-xs text-white/50 mt-1">긍정 언급</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">{negativeResults.length}</div>
                <div className="text-xs text-white/50 mt-1">부정 언급</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{scan.credits_used}</div>
                <div className="text-xs text-white/50 mt-1">사용 크레딧</div>
              </div>
            </div>

            {/* Sub-scores */}
            <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-white/10">
              <ScoreGauge score={scan.ai_visibility_score ?? 0} label="AI 점수" size="small" />
              <ScoreGauge score={scan.seo_visibility_score ?? 0} label="SEO 점수" size="small" />
            </div>
          </div>
        </div>

        {/* Provider Results */}
        <CollapsibleSection
          title="플랫폼별 결과"
          icon={<ChartBar size={20} weight="duotone" className="text-primary-400" />}
          defaultOpen={true}
        >
          <div className="space-y-3 mt-4">
            {scan.scan_results.length > 0 ? (
              scan.scan_results.map((result, index) => {
                const info = PROVIDER_INFO[result.provider] || DEFAULT_PROVIDER;
                const isExpanded = expandedResults.has(result.id);

                return (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border border-white/10 rounded-xl overflow-hidden"
                  >
                    {/* Provider Header */}
                    <div className="p-4 flex items-center justify-between bg-white/5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                          style={{ backgroundColor: `${info.color}20`, color: info.color }}
                        >
                          {info.icon}
                        </div>
                        <div>
                          <span className="font-medium" style={{ color: info.color }}>
                            {info.name}
                          </span>
                          {result.response_time_ms && (
                            <span className="text-xs text-white/40 ml-2">
                              {(result.response_time_ms / 1000).toFixed(1)}s
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {result.brand_mentioned ? (
                          <>
                            <ProminenceBadge
                              prominence={(result as unknown as { mention_prominence?: string }).mention_prominence || undefined}
                              position={result.mention_position}
                            />
                            <SentimentBadge sentiment={result.sentiment} />
                            <CheckCircle size={20} weight="fill" className="text-green-400" />
                          </>
                        ) : (
                          <>
                            <span className="text-xs text-white/50">미언급</span>
                            <XCircle size={20} weight="fill" className="text-red-400" />
                          </>
                        )}
                      </div>
                    </div>

                    {/* Response Content */}
                    <div className="p-4 border-t border-white/5">
                      <div className={`text-sm text-white/70 prose prose-invert prose-sm max-w-none prose-headings:text-white/90 prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-2 prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-strong:text-white/90 ${isExpanded ? '' : 'line-clamp-4'}`}>
                        <ReactMarkdown>
                          {result.content || result.error_message || '응답 없음'}
                        </ReactMarkdown>
                      </div>
                      {(result.content?.length ?? 0) > 200 && (
                        <button
                          onClick={() => toggleExpanded(result.id)}
                          className="text-sm text-primary-400 hover:underline mt-2 flex items-center gap-1"
                        >
                          <CaretDown
                            size={14}
                            className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          />
                          {isExpanded ? '접기' : '전체 보기'}
                        </button>
                      )}
                    </div>

                    {/* Competitor mentions */}
                    {result.competitor_mentions && Object.keys(result.competitor_mentions).length > 0 && (
                      <div className="px-4 pb-4">
                        <div className="flex items-center gap-2 text-xs text-white/50">
                          <Users size={12} />
                          <span>경쟁사 언급:</span>
                          {Object.entries(result.competitor_mentions).map(([name, count]) => (
                            <span key={name} className="px-2 py-0.5 bg-white/10 rounded">
                              {name} ({count as number}회)
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })
            ) : (scan.status === 'processing' || scan.status === 'pending') ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CircleNotch size={32} weight="bold" className="text-blue-400 animate-spin mb-2" />
                <p className="text-sm text-white/50">결과를 가져오는 중...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock size={32} weight="duotone" className="text-white/20 mb-2" />
                <p className="text-sm text-white/50">결과가 없습니다</p>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Insights */}
        {hasInsights && (
          <div className="mt-6 space-y-4">
            {strengths.length > 0 && (
              <CollapsibleSection
                title={`강점 (${strengths.length})`}
                icon={<Star size={20} weight="duotone" className="text-green-400" />}
                defaultOpen={true}
              >
                <ul className="space-y-3 mt-4">
                  {strengths.map((insight) => (
                    <li key={insight.id} className="flex gap-3">
                      <CheckCircle size={20} weight="fill" className="text-green-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-white">{insight.title}</p>
                        <p className="text-sm text-white/60 mt-1">{insight.description}</p>
                        {insight.action_items && insight.action_items.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {insight.action_items.map((item, i) => (
                              <li key={i} className="text-xs text-white/50 flex items-center gap-1">
                                <span className="w-1 h-1 bg-green-400 rounded-full" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </CollapsibleSection>
            )}

            {weaknesses.length > 0 && (
              <CollapsibleSection
                title={`개선점 (${weaknesses.length})`}
                icon={<Warning size={20} weight="duotone" className="text-yellow-400" />}
                defaultOpen={true}
              >
                <ul className="space-y-3 mt-4">
                  {weaknesses.map((insight) => (
                    <li key={insight.id} className="flex gap-3">
                      <Warning size={20} weight="fill" className="text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-white">{insight.title}</p>
                        <p className="text-sm text-white/60 mt-1">{insight.description}</p>
                        {insight.action_items && insight.action_items.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {insight.action_items.map((item, i) => (
                              <li key={i} className="text-xs text-white/50 flex items-center gap-1">
                                <span className="w-1 h-1 bg-yellow-400 rounded-full" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </CollapsibleSection>
            )}

            {opportunities.length > 0 && (
              <CollapsibleSection
                title={`추천 (${opportunities.length})`}
                icon={<Lightbulb size={20} weight="duotone" className="text-primary-400" />}
                defaultOpen={true}
              >
                <ul className="space-y-3 mt-4">
                  {opportunities.map((insight) => (
                    <li key={insight.id} className="flex gap-3">
                      <Lightbulb size={20} weight="fill" className="text-primary-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-white">{insight.title}</p>
                        <p className="text-sm text-white/60 mt-1">{insight.description}</p>
                        {insight.action_items && insight.action_items.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {insight.action_items.map((item, i) => (
                              <li key={i} className="text-xs text-white/50 flex items-center gap-1">
                                <span className="w-1 h-1 bg-primary-400 rounded-full" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </CollapsibleSection>
            )}
          </div>
        )}

        {/* AEO Tips */}
        {scan.status === 'completed' && !hasInsights && (
          <div className="mt-6">
            <CollapsibleSection
              title="AEO 최적화 팁"
              icon={<Info size={20} weight="duotone" className="text-blue-400" />}
              defaultOpen={true}
            >
              <div className="mt-4 space-y-3">
                <div className="flex gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <Target size={20} className="text-blue-400 flex-shrink-0" />
                  <p className="text-sm text-white/70">
                    FAQ 페이지에 구조화된 데이터(Schema.org)를 추가하여 AI가 정보를 쉽게 인식하도록 하세요.
                  </p>
                </div>
                <div className="flex gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <Target size={20} className="text-blue-400 flex-shrink-0" />
                  <p className="text-sm text-white/70">
                    브랜드의 핵심 가치와 차별점을 명확하게 설명하는 &ldquo;About&rdquo; 페이지를 최적화하세요.
                  </p>
                </div>
                <div className="flex gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <Target size={20} className="text-blue-400 flex-shrink-0" />
                  <p className="text-sm text-white/70">
                    정기적으로 AI 가시성을 모니터링하고 경쟁사 대비 순위 변화를 추적하세요.
                  </p>
                </div>
              </div>
            </CollapsibleSection>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 text-sm font-medium text-white/70 border border-white/20 hover:bg-white/10 rounded-lg transition-colors"
          >
            대시보드로 돌아가기
          </button>
          <button
            onClick={() => router.push(`/scan/new?brand=${scan.brand_id}`)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
          >
            <ArrowClockwise size={16} weight="bold" />
            새 스캔
          </button>
        </div>
      </main>
    </>
  );
}
