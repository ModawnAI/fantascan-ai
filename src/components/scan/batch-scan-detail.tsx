'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
} from '@phosphor-icons/react';
import Link from 'next/link';
import { useBatchScan, usePauseBatchScan, useResumeBatchScan } from '@/hooks/use-batch-scans';
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
  isExpanded: boolean;
  onToggle: () => void;
}

function QuestionCard({ question, isExpanded, onToggle }: QuestionCardProps) {
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
