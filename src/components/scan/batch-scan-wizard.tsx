'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Rocket,
  CircleNotch,
  Check,
  List,
  Gear,
  CaretRight,
  Warning,
  Clock,
  CurrencyCircleDollar,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { useQuestionSets } from '@/hooks/use-question-sets';
import { useScanSettings } from '@/hooks/use-scan-settings';
import { useUserCredits } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { calculateEstimatedCredits, calculateDetailedDuration, formatCredits } from '@/lib/credits';
import type { QuestionSet, QuestionSetItem } from '@/types/batch-scan';
import type { Brand } from '@/types/database';

interface BatchScanWizardProps {
  brand: Brand;
}

export function BatchScanWizard({ brand }: BatchScanWizardProps) {
  const router = useRouter();
  const { sets, isLoading: setsLoading } = useQuestionSets();
  const { settings, isLoading: settingsLoading } = useScanSettings();
  const { credits: userCredits, isLoading: creditsLoading } = useUserCredits();

  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [expandedSetId, setExpandedSetId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Find selected set's details
  const selectedSet = useMemo(
    () => sets.find((s) => s.id === selectedSetId),
    [sets, selectedSetId]
  );

  // Calculate estimates
  const estimates = useMemo(() => {
    if (!selectedSet || !settings) return null;

    const questionCount = selectedSet.question_count;
    const creditEstimate = calculateEstimatedCredits(
      questionCount,
      settings.gemini_iterations,
      settings.openai_iterations
    );
    const durationEstimate = calculateDetailedDuration(
      questionCount,
      settings.gemini_iterations,
      settings.openai_iterations
    );

    return {
      ...creditEstimate,
      ...durationEstimate,
      questionCount,
    };
  }, [selectedSet, settings]);

  const hasEnoughCredits = userCredits !== undefined && estimates
    ? userCredits >= estimates.totalCredits
    : true;

  const handleStartScan = async () => {
    if (!selectedSetId || !brand.id) return;

    setIsStarting(true);
    setError(null);

    try {
      const response = await fetch('/api/batch-scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_set_id: selectedSetId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '스캔 시작에 실패했습니다');
      }

      const { batchScan } = await response.json();
      router.push(`/scan/${batchScan.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '스캔 시작에 실패했습니다');
      setIsStarting(false);
    }
  };

  const isLoading = setsLoading || settingsLoading || creditsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <CircleNotch size={32} weight="bold" className="animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">🔍 새 스캔 시작</h1>
        <p className="text-white/60 mt-2">
          질문 세트를 선택하여 AI 가시성 스캔을 시작하세요.
        </p>
      </div>

      {/* Brand Info */}
      <div className="p-4 bg-white/5 rounded-xl border border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/50">브랜드</p>
            <p className="text-lg font-semibold text-white">{brand.name}</p>
            {brand.competitors && brand.competitors.length > 0 && (
              <p className="text-sm text-white/40 mt-1">
                경쟁사: {brand.competitors.slice(0, 3).join(', ')}
                {brand.competitors.length > 3 && ` 외 ${brand.competitors.length - 3}개`}
              </p>
            )}
          </div>
          <Link
            href="/settings"
            className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
          >
            설정에서 변경 <CaretRight size={14} weight="bold" />
          </Link>
        </div>
      </div>

      {/* Question Set Selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <List size={20} weight="fill" className="text-primary-400" />
            질문 세트 선택
          </h2>
          <Link
            href="/settings/question-sets"
            className="text-sm text-primary-400 hover:text-primary-300"
          >
            + 새 세트 만들기
          </Link>
        </div>

        {sets.length === 0 ? (
          <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
            <List size={48} weight="thin" className="mx-auto text-white/20 mb-4" />
            <h3 className="text-lg font-medium text-white/70 mb-2">
              질문 세트가 없습니다
            </h3>
            <p className="text-sm text-white/50 mb-6">
              먼저 질문 세트를 만들어주세요.
            </p>
            <Link href="/settings/question-sets">
              <Button>질문 세트 만들기</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sets.map((set) => (
              <button
                key={set.id}
                onClick={() => {
                  setSelectedSetId(set.id);
                  setExpandedSetId(expandedSetId === set.id ? null : set.id);
                }}
                className={`w-full text-left p-4 rounded-xl border transition-colors ${
                  selectedSetId === set.id
                    ? 'bg-primary-500/20 border-primary-500/50'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedSetId === set.id
                          ? 'border-primary-500 bg-primary-500'
                          : 'border-white/30'
                      }`}
                    >
                      {selectedSetId === set.id && (
                        <Check size={12} weight="bold" className="text-white" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-white">{set.name}</p>
                      <p className="text-sm text-white/50">
                        질문 {set.question_count}개
                      </p>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Estimates */}
      {estimates && settings && (
        <div className="p-6 bg-white/5 rounded-xl border border-white/10 space-y-4">
          <h2 className="text-lg font-semibold text-white">📊 예상 정보</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white/[0.03] rounded-lg">
              <p className="text-sm text-white/50 mb-1">총 API 콜</p>
              <p className="text-xl font-bold text-white">
                {estimates.totalIterations}회
              </p>
              <p className="text-xs text-white/40 mt-1">
                Gemini {estimates.geminiIterations} + GPT {estimates.openaiIterations}
              </p>
            </div>

            <div className="p-4 bg-white/[0.03] rounded-lg">
              <div className="flex items-start gap-2">
                <Clock size={16} className="text-white/50 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-sm text-white/50 mb-1">예상 시간</p>
                  <p className="text-xl font-bold text-white">
                    {estimates.formattedMin} ~ {estimates.formattedMax}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white/[0.03] rounded-lg">
              <div className="flex items-start gap-2">
                <CurrencyCircleDollar size={16} className="text-white/50 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-sm text-white/50 mb-1">예상 크레딧</p>
                  <p className="text-xl font-bold text-white">
                    {formatCredits(estimates.totalCredits)} 크레딧
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white/[0.03] rounded-lg">
              <p className="text-sm text-white/50 mb-1">보유 크레딧</p>
              <p className={`text-xl font-bold ${hasEnoughCredits ? 'text-green-400' : 'text-red-400'}`}>
                {formatCredits(userCredits || 0)} 크레딧
                {hasEnoughCredits ? ' ✅' : ' ⚠️'}
              </p>
            </div>
          </div>

          {!hasEnoughCredits && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
              <Warning size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-300">
                <p className="font-medium">크레딧이 부족합니다</p>
                <p className="text-red-300/70">
                  스캔을 시작하려면 {formatCredits(estimates.totalCredits - (userCredits || 0))} 크레딧이 더 필요합니다.
                </p>
              </div>
            </div>
          )}

          <div className="text-xs text-white/40 pt-2 border-t border-white/10">
            ⚠️ 스캔은 서버에서 진행되므로 브라우저를 닫아도 계속됩니다.
            언제든지 일시정지하고 나중에 재개할 수 있습니다.
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
          <Warning size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <Button variant="ghost" onClick={() => router.push('/dashboard')}>
          취소
        </Button>
        <Button
          onClick={handleStartScan}
          disabled={!selectedSetId || !hasEnoughCredits || isStarting}
          className="min-w-[200px]"
        >
          {isStarting ? (
            <>
              <CircleNotch size={16} weight="bold" className="animate-spin mr-2" />
              스캔 시작 중...
            </>
          ) : (
            <>
              <Rocket size={16} weight="bold" className="mr-2" />
              스캔 시작 ({estimates ? formatCredits(estimates.totalCredits) : 0} 크레딧)
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
