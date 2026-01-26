'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, ArrowClockwise, CheckCircle, XCircle, Clock, CircleNotch } from '@phosphor-icons/react';
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

const PROVIDER_INFO: Record<ProviderType, { name: string; color: string }> = {
  gemini: { name: 'Gemini', color: '#4285F4' },
  openai: { name: 'ChatGPT', color: '#10A37F' },
  anthropic: { name: 'Claude', color: '#D97706' },
  grok: { name: 'Grok', color: '#1DA1F2' },
  perplexity: { name: 'Perplexity', color: '#6366F1' },
  google_search: { name: 'Google', color: '#EA4335' },
};

const STATUS_CONFIG: Record<ScanStatus, { label: string; colorClass: string }> = {
  pending: { label: '대기중', colorClass: 'bg-white/20 text-white/50' },
  processing: { label: '처리중', colorClass: 'bg-blue-400/20 text-blue-400' },
  completed: { label: '완료', colorClass: 'bg-green-400/20 text-green-400' },
  failed: { label: '실패', colorClass: 'bg-red-400/20 text-red-400' },
};

const DEFAULT_STATUS = { label: '알 수 없음', colorClass: 'bg-white/10 text-white/40' };
const DEFAULT_PROVIDER = { name: 'Unknown', color: '#666666' };

export function ScanResults({ scan: initialScan }: ScanResultsProps) {
  const router = useRouter();
  const [scan, setScan] = useState(initialScan);
  const [polling, setPolling] = useState(
    initialScan.status === 'pending' || initialScan.status === 'processing'
  );
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());

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
  const threats = scan.insights.filter(i => i.insight_type === 'threat');
  const opportunities = scan.insights.filter(i => i.insight_type === 'opportunity');
  const hasInsights = scan.insights.length > 0;

  return (
    <>
      <header className="bg-white/5 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft size={16} weight="bold" />
              대시보드
            </button>
            {polling && (
              <div className="flex items-center gap-2 text-sm text-blue-400">
                <CircleNotch size={16} weight="bold" className="animate-spin" />
                처리중...
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
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
          <h1 className="text-xl font-bold text-white mb-2">{query}</h1>
          <p className="text-sm text-white/50">
            {new Date(scan.created_at).toLocaleString('ko-KR')}
          </p>
        </div>

        {/* Overall Score */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50 mb-1">총 가시성 점수</p>
              <p className="text-4xl font-bold text-primary-400">
                {scan.visibility_score ?? 0}
                <span className="text-lg text-white/40">/100</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-white/50 mb-1">브랜드 언급</p>
              <p className="text-2xl font-bold text-white">
                {scan.scan_results.filter((r) => r.brand_mentioned).length}
                <span className="text-lg text-white/40">
                  /{scan.total_providers}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Provider Results */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden mb-6">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white">제공자별 결과</h2>
          </div>
          <div className="p-6 space-y-4">
            {scan.scan_results.length > 0 ? (
              scan.scan_results.map((result, index) => {
                const info = PROVIDER_INFO[result.provider] || DEFAULT_PROVIDER;

                return (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border border-white/10 rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: info.color }}
                        />
                        <span className="font-medium" style={{ color: info.color }}>
                          {info.name}
                        </span>
                      </div>
                      {result.brand_mentioned ? (
                        <div className="flex items-center gap-1 text-green-400">
                          <CheckCircle size={16} weight="fill" />
                          <span className="text-sm">언급됨</span>
                          {result.mention_position && (
                            <span className="text-xs text-white/50 ml-1">
                              ({result.mention_position}위)
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-400">
                          <XCircle size={16} weight="fill" />
                          <span className="text-sm">미언급</span>
                        </div>
                      )}
                    </div>

                    <div className="bg-white/5 rounded-lg p-3">
                      <div className={`text-sm text-white/70 prose prose-invert prose-sm max-w-none prose-headings:text-white/90 prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-2 prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-strong:text-white/90 ${expandedResults.has(result.id) ? '' : 'line-clamp-4'}`}>
                        <ReactMarkdown>
                          {result.content || result.error_message || '응답 없음'}
                        </ReactMarkdown>
                      </div>
                      {(result.content?.length ?? 0) > 300 && (
                        <button
                          onClick={() => toggleExpanded(result.id)}
                          className="text-sm text-primary-400 hover:underline mt-2"
                        >
                          {expandedResults.has(result.id) ? '접기' : '더 보기'}
                        </button>
                      )}
                    </div>
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
        </div>

        {/* Insights */}
        {hasInsights && (
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">AI 인사이트</h2>
            </div>
            <div className="p-6 space-y-4">
              {strengths.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-green-400 mb-2">강점</h4>
                  <ul className="space-y-1">
                    {strengths.map((insight) => (
                      <li key={insight.id} className="text-sm text-white/70 pl-4 relative before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:bg-green-400 before:rounded-full">
                        {insight.description}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {threats.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-red-400 mb-2">개선점</h4>
                  <ul className="space-y-1">
                    {threats.map((insight) => (
                      <li key={insight.id} className="text-sm text-white/70 pl-4 relative before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:bg-red-400 before:rounded-full">
                        {insight.description}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {opportunities.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-yellow-400 mb-2">추천</h4>
                  <ul className="space-y-1">
                    {opportunities.map((insight) => (
                      <li key={insight.id} className="text-sm text-white/70 pl-4 relative before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:bg-yellow-400 before:rounded-full">
                        {insight.description}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
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
