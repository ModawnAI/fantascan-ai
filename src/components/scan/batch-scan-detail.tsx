'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import {
  ArrowLeft,
  CircleNotch,
  Pause,
  Play,
  Check,
  X,
  Clock,
  CurrencyCircleDollar,
  ChartLine,
  Warning,
  CaretDown,
  CaretUp,
  Link as LinkIcon,
  ArrowSquareOut,
  Eye,
  EyeSlash,
  ChatText,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { useBatchScan, usePauseBatchScan, useResumeBatchScan, useBatchScanIterations } from '@/hooks/use-batch-scans';
import type { BatchScanIteration, BatchProvider } from '@/types/batch-scan';
import { Button } from '@/components/ui/button';
import {
  BATCH_SCAN_STATUS_LABELS,
  QUESTION_STATUS_LABELS,
  PAUSE_REASON_LABELS,
  type BatchScanQuestion,
} from '@/types/batch-scan';
import { formatDuration, formatCredits, formatPercent, calculateProgress } from '@/lib/credits';

interface BatchScanDetailProps {
  scanId: string;
}

export function BatchScanDetail({ scanId }: BatchScanDetailProps) {
  const router = useRouter();
  const { batchScan, questions, isLoading, error, mutate } = useBatchScan(scanId);
  const { pauseScan, isPausing } = usePauseBatchScan(scanId);
  const { resumeScan, isResuming } = useResumeBatchScan(scanId);
  
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  // Calculate progress
  const progress = useMemo(() => {
    if (!batchScan) return 0;
    return calculateProgress(batchScan.completed_iterations, batchScan.total_iterations);
  }, [batchScan]);

  // Calculate elapsed time
  const elapsedTime = useMemo(() => {
    if (!batchScan?.started_at) return null;
    const startTime = new Date(batchScan.started_at).getTime();
    const endTime = batchScan.completed_at
      ? new Date(batchScan.completed_at).getTime()
      : Date.now();
    return formatDuration(endTime - startTime);
  }, [batchScan]);

  const handlePause = async () => {
    try {
      await pauseScan();
      mutate();
    } catch (err) {
      console.error('Failed to pause scan:', err);
    }
  };

  const handleResume = async () => {
    try {
      await resumeScan();
      mutate();
    } catch (err) {
      console.error('Failed to resume scan:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <CircleNotch size={32} weight="bold" className="animate-spin text-primary-500" />
      </div>
    );
  }

  if (error || !batchScan) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 mb-4">스캔을 불러오는 데 실패했습니다.</p>
        <Button variant="ghost" onClick={() => router.push('/dashboard')}>
          대시보드로 돌아가기
        </Button>
      </div>
    );
  }

  const isRunning = batchScan.status === 'running';
  const isPaused = batchScan.status === 'paused';
  const isCompleted = batchScan.status === 'completed';
  const isFailed = batchScan.status === 'failed';

  const statusColors: Record<string, string> = {
    pending: 'text-gray-400',
    running: 'text-blue-400',
    paused: 'text-yellow-400',
    completed: 'text-green-400',
    failed: 'text-red-400',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${statusColors[batchScan.status]}`}>
              {isRunning && <CircleNotch size={16} weight="bold" className="inline animate-spin mr-1" />}
              {isPaused && <Pause size={16} weight="fill" className="inline mr-1" />}
              {isCompleted && <Check size={16} weight="bold" className="inline mr-1" />}
              {isFailed && <X size={16} weight="bold" className="inline mr-1" />}
              {BATCH_SCAN_STATUS_LABELS[batchScan.status]}
            </span>
            {isPaused && batchScan.pause_reason && (
              <span className="text-xs text-white/40">
                ({PAUSE_REASON_LABELS[batchScan.pause_reason]})
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-white mt-1">
            {batchScan.question_set_name || '배치 스캔'}
          </h1>
          <p className="text-sm text-white/50">
            {batchScan.brand_name} • {new Date(batchScan.created_at).toLocaleDateString('ko-KR')}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isRunning && (
            <Button
              variant="secondary"
              onClick={handlePause}
              disabled={isPausing}
            >
              {isPausing ? (
                <CircleNotch size={16} weight="bold" className="animate-spin mr-2" />
              ) : (
                <Pause size={16} weight="fill" className="mr-2" />
              )}
              일시정지
            </Button>
          )}
          {isPaused && (
            <Button onClick={handleResume} disabled={isResuming}>
              {isResuming ? (
                <CircleNotch size={16} weight="bold" className="animate-spin mr-2" />
              ) : (
                <Play size={16} weight="fill" className="mr-2" />
              )}
              재개하기
            </Button>
          )}
          {isCompleted && (
            <Link href="/dashboard">
              <Button>대시보드로 이동</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="p-6 bg-white/5 rounded-xl border border-white/10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-white font-medium">전체 진행률</span>
          <span className="text-white/70 text-sm">
            {batchScan.completed_iterations}/{batchScan.total_iterations}
          </span>
        </div>
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              isRunning ? 'bg-blue-500' :
              isCompleted ? 'bg-green-500' :
              isPaused ? 'bg-yellow-500' :
              'bg-gray-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-3 text-sm text-white/50">
          <div className="flex items-center gap-4">
            {elapsedTime && (
              <span className="flex items-center gap-1">
                <Clock size={14} />
                {isCompleted ? '소요 시간: ' : '경과: '}{elapsedTime}
              </span>
            )}
            <span className="flex items-center gap-1">
              <CurrencyCircleDollar size={14} />
              {formatCredits(batchScan.used_credits)}/{formatCredits(batchScan.estimated_credits)} 크레딧
            </span>
          </div>
          {batchScan.overall_exposure_rate !== null && (
            <span className="flex items-center gap-1 text-primary-400">
              <ChartLine size={14} />
              노출률: {formatPercent(batchScan.overall_exposure_rate)}
            </span>
          )}
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">📋 질문별 진행 상황</h2>
        
        <div className="space-y-3">
          {questions.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              scanId={scanId}
              isExpanded={expandedQuestionId === question.id}
              onToggle={() => setExpandedQuestionId(
                expandedQuestionId === question.id ? null : question.id
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Question Card Component
// ============================================

interface QuestionCardProps {
  question: BatchScanQuestion;
  scanId: string;
  isExpanded: boolean;
  onToggle: () => void;
}

function QuestionCard({ question, scanId, isExpanded, onToggle }: QuestionCardProps) {
  const [showResponses, setShowResponses] = useState(false);
  const [activeProvider, setActiveProvider] = useState<BatchProvider>('gemini');
  const [expandedIterationId, setExpandedIterationId] = useState<string | null>(null);

  // Lazy fetch: only when expanded AND showResponses is true
  const { iterations, isLoading: iterationsLoading } = useBatchScanIterations(
    scanId,
    isExpanded && showResponses ? question.id : null
  );
  const geminiProgress = calculateProgress(question.gemini_completed, question.gemini_total);
  const openaiProgress = calculateProgress(question.openai_completed, question.openai_total);

  const statusIcon = {
    pending: <Clock size={16} weight="fill" className="text-gray-400" />,
    running: <CircleNotch size={16} weight="bold" className="animate-spin text-blue-400" />,
    completed: <Check size={16} weight="bold" className="text-green-400" />,
    failed: <X size={16} weight="bold" className="text-red-400" />,
  };

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className="mt-1">{statusIcon[question.status]}</div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium truncate">
              {question.question_text}
            </p>
            <div className="flex items-center gap-4 mt-2 text-sm text-white/50">
              <span>
                Gemini: {question.gemini_completed}/{question.gemini_total}
              </span>
              <span>
                GPT: {question.openai_completed}/{question.openai_total}
              </span>
              {question.avg_exposure_rate !== null && (
                <span className="text-primary-400">
                  평균 노출률: {formatPercent(question.avg_exposure_rate)}
                </span>
              )}
            </div>
          </div>
          {isExpanded ? (
            <CaretUp size={16} className="text-white/40" weight="bold" />
          ) : (
            <CaretDown size={16} className="text-white/40" weight="bold" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/10 pt-4">
          {/* Gemini Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/70">Gemini</span>
              <span className="text-white/50">
                {question.gemini_completed}/{question.gemini_total} 완료
                {question.gemini_exposure_rate !== null && (
                  <span className="ml-2 text-blue-400">
                    ({formatPercent(question.gemini_exposure_rate)} 노출)
                  </span>
                )}
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${geminiProgress}%` }}
              />
            </div>
          </div>

          {/* OpenAI Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/70">GPT-4</span>
              <span className="text-white/50">
                {question.openai_completed}/{question.openai_total} 완료
                {question.openai_exposure_rate !== null && (
                  <span className="ml-2 text-green-400">
                    ({formatPercent(question.openai_exposure_rate)} 노출)
                  </span>
                )}
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all"
                style={{ width: `${openaiProgress}%` }}
              />
            </div>
          </div>

          {/* Sentiment */}
          {(question.sentiment_positive > 0 || question.sentiment_neutral > 0 || question.sentiment_negative > 0) && (
            <div className="flex items-center gap-4 text-xs text-white/50 pt-2 border-t border-white/10">
              <span>감성 분석:</span>
              {question.sentiment_positive > 0 && (
                <span className="text-green-400">긍정 {question.sentiment_positive}</span>
              )}
              {question.sentiment_neutral > 0 && (
                <span className="text-gray-400">중립 {question.sentiment_neutral}</span>
              )}
              {question.sentiment_negative > 0 && (
                <span className="text-red-400">부정 {question.sentiment_negative}</span>
              )}
            </div>
          )}

          {/* Individual Responses (개별 응답 보기) */}
          <div className="pt-2 border-t border-white/10">
            <button
              onClick={() => setShowResponses(!showResponses)}
              className="flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300 transition-colors"
            >
              <ChatText size={16} weight="fill" />
              <span>{showResponses ? '응답 숨기기' : '개별 응답 보기'}</span>
              {showResponses ? <CaretUp size={12} weight="bold" /> : <CaretDown size={12} weight="bold" />}
            </button>

            {showResponses && (
              <div className="mt-3 space-y-3">
                {/* Provider Tabs */}
                <div className="flex gap-1">
                  <button
                    onClick={() => setActiveProvider('gemini')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      activeProvider === 'gemini'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'text-white/50 hover:text-white/70 hover:bg-white/5'
                    }`}
                  >
                    Gemini ({iterations.filter(i => i.provider === 'gemini').length})
                  </button>
                  <button
                    onClick={() => setActiveProvider('openai')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      activeProvider === 'openai'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'text-white/50 hover:text-white/70 hover:bg-white/5'
                    }`}
                  >
                    GPT ({iterations.filter(i => i.provider === 'openai').length})
                  </button>
                </div>

                {/* Loading State */}
                {iterationsLoading && (
                  <div className="flex items-center justify-center py-6">
                    <CircleNotch size={20} weight="bold" className="animate-spin text-primary-500" />
                    <span className="ml-2 text-sm text-white/50">응답을 불러오는 중...</span>
                  </div>
                )}

                {/* Iteration Cards */}
                {!iterationsLoading && (
                  <div className="space-y-2">
                    {iterations
                      .filter(iter => iter.provider === activeProvider)
                      .map((iter) => (
                        <IterationCard
                          key={iter.id}
                          iteration={iter}
                          isExpanded={expandedIterationId === iter.id}
                          onToggleExpand={() => setExpandedIterationId(
                            expandedIterationId === iter.id ? null : iter.id
                          )}
                        />
                      ))}
                    {iterations.filter(iter => iter.provider === activeProvider).length === 0 && (
                      <p className="text-xs text-white/40 py-4 text-center">
                        {activeProvider === 'gemini' ? 'Gemini' : 'GPT'} 응답이 없습니다.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Citations (인용 소스 - API 응답에 URL이 있을 때만) */}
          {question.citations && question.citations.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="flex items-center gap-2 text-xs text-white/50">
                <LinkIcon size={14} />
                <span>인용된 소스 ({question.citations.length})</span>
              </div>
              <div className="space-y-1">
                {question.citations.slice(0, 5).map((citation, idx) => (
                  <a
                    key={idx}
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors group"
                  >
                    <ArrowSquareOut size={12} className="text-white/40 group-hover:text-primary-400 flex-shrink-0" />
                    <span className="text-xs text-white/70 group-hover:text-primary-400 truncate">
                      {citation.title || citation.url}
                    </span>
                  </a>
                ))}
                {question.citations.length > 5 && (
                  <p className="text-xs text-white/40 pl-2">
                    + {question.citations.length - 5}개 더 보기
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {question.last_error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
              <Warning size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">{question.last_error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Iteration Card Component (개별 LLM 응답)
// ============================================

interface IterationCardProps {
  iteration: BatchScanIteration;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function IterationCard({ iteration, isExpanded, onToggleExpand }: IterationCardProps) {
  const hasContent = iteration.response_text && iteration.response_text.length > 0;
  const isLong = (iteration.response_text?.length ?? 0) > 300;

  const sentimentLabel: Record<string, { text: string; color: string }> = {
    positive: { text: '긍정', color: 'text-green-400' },
    neutral: { text: '중립', color: 'text-gray-400' },
    negative: { text: '부정', color: 'text-red-400' },
  };

  return (
    <div className="bg-white/[0.03] rounded-lg border border-white/[0.06] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-white/60 font-mono">
            #{iteration.iteration_index + 1}
          </span>
          {iteration.brand_mentioned !== null && (
            <span className={`flex items-center gap-1 ${
              iteration.brand_mentioned ? 'text-green-400' : 'text-red-400'
            }`}>
              {iteration.brand_mentioned ? (
                <Eye size={14} weight="fill" />
              ) : (
                <EyeSlash size={14} weight="fill" />
              )}
              {iteration.brand_mentioned ? '브랜드 노출' : '미노출'}
            </span>
          )}
          {iteration.sentiment && sentimentLabel[iteration.sentiment] && (
            <span className={sentimentLabel[iteration.sentiment].color}>
              {sentimentLabel[iteration.sentiment].text}
            </span>
          )}
          {iteration.response_time_ms && (
            <span className="text-white/40">
              {(iteration.response_time_ms / 1000).toFixed(1)}s
            </span>
          )}
          {iteration.status === 'failed' && (
            <span className="text-red-400">실패</span>
          )}
          {iteration.status === 'timeout' && (
            <span className="text-yellow-400">타임아웃</span>
          )}
        </div>
        {hasContent && isLong && (
          <button
            onClick={onToggleExpand}
            className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
          >
            {isExpanded ? '접기' : '전체 보기'}
          </button>
        )}
      </div>

      {/* Response Content */}
      {hasContent && (
        <div className={`px-3 pb-3 text-sm text-white/70
          prose prose-invert prose-sm max-w-none
          prose-p:my-1.5 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-strong:text-white/90
          ${!isExpanded && isLong ? 'line-clamp-4' : ''}`}
        >
          <ReactMarkdown>
            {iteration.response_text!}
          </ReactMarkdown>
        </div>
      )}

      {/* Error Message */}
      {iteration.error_message && !hasContent && (
        <div className="px-3 pb-3">
          <p className="text-xs text-red-300">{iteration.error_message}</p>
        </div>
      )}
    </div>
  );
}
