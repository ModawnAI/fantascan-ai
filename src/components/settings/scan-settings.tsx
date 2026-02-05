'use client';

import { useState, useEffect } from 'react';
import { Gear, Info, CircleNotch, Check, List, CaretRight } from '@phosphor-icons/react';
import Link from 'next/link';
import { useScanSettings, useUpdateScanSettings } from '@/hooks/use-scan-settings';
import { useBrands } from '@/hooks/use-brands';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { calculateEstimatedCredits, calculateDetailedDuration, CREDIT_COSTS } from '@/lib/credits';

export function ScanSettings() {
  const { settings, defaultBrand, isLoading, mutate } = useScanSettings();
  const { updateSettings, isUpdating } = useUpdateScanSettings();
  const { brands } = useBrands();

  // Local state for form
  const [geminiIterations, setGeminiIterations] = useState(50);
  const [openaiIterations, setOpenaiIterations] = useState(50);
  const [timeoutSeconds, setTimeoutSeconds] = useState(30);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Sync local state with fetched settings
  useEffect(() => {
    if (settings) {
      setGeminiIterations(settings.gemini_iterations);
      setOpenaiIterations(settings.openai_iterations);
      setTimeoutSeconds(Math.floor(settings.timeout_per_call_ms / 1000));
      setSelectedBrandId(settings.default_brand_id);
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateSettings({
        gemini_iterations: geminiIterations,
        openai_iterations: openaiIterations,
        timeout_per_call_ms: timeoutSeconds * 1000,
        default_brand_id: selectedBrandId,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  // Example calculation
  const exampleQuestions = 5;
  const creditEstimate = calculateEstimatedCredits(
    exampleQuestions,
    geminiIterations,
    openaiIterations
  );
  const durationEstimate = calculateDetailedDuration(
    exampleQuestions,
    geminiIterations,
    openaiIterations
  );

  if (isLoading) {
    return (
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <div className="flex items-center justify-center py-8">
          <CircleNotch size={32} weight="bold" className="animate-spin text-primary-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-2 text-lg font-semibold text-white">
          <Gear size={20} weight="fill" />
          스캔 설정
        </div>
        <p className="text-sm text-white/50 mt-1">배치 스캔에 적용되는 기본 설정</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Default Brand */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/70">기본 브랜드</label>
          <Select
            value={selectedBrandId || ''}
            onValueChange={(v) => setSelectedBrandId(v || null)}
          >
            <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="브랜드 선택" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-white/10">
              {brands.map((brand) => (
                <SelectItem
                  key={brand.id}
                  value={brand.id}
                  className="text-white hover:bg-white/10"
                >
                  {brand.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-white/40">스캔 시 이 브랜드가 자동으로 선택됩니다.</p>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10" />

        {/* Provider Iterations */}
        <div className="space-y-4">
          <label className="text-sm font-medium text-white/70">
            🤖 AI 프로바이더별 반복 횟수
          </label>

          {/* Gemini */}
          <div className="p-4 bg-white/[0.03] rounded-xl border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white font-medium">Gemini</span>
              <span className="text-xs text-white/40">{CREDIT_COSTS.gemini} 크레딧/회</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="100"
                value={geminiIterations}
                onChange={(e) => setGeminiIterations(Number(e.target.value))}
                className="flex-1 accent-primary-500"
              />
              <div className="w-20">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={geminiIterations}
                  onChange={(e) => setGeminiIterations(Math.min(100, Math.max(1, Number(e.target.value))))}
                  className="w-full px-2 py-1 text-center bg-white/5 border border-white/10 rounded text-white text-sm"
                />
              </div>
              <span className="text-white/50 text-sm">회</span>
            </div>
            <p className="text-xs text-white/40">질문당 Gemini에 {geminiIterations}회 질문합니다.</p>
          </div>

          {/* OpenAI */}
          <div className="p-4 bg-white/[0.03] rounded-xl border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white font-medium">GPT-4</span>
              <span className="text-xs text-white/40">{CREDIT_COSTS.openai} 크레딧/회</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="100"
                value={openaiIterations}
                onChange={(e) => setOpenaiIterations(Number(e.target.value))}
                className="flex-1 accent-primary-500"
              />
              <div className="w-20">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={openaiIterations}
                  onChange={(e) => setOpenaiIterations(Math.min(100, Math.max(1, Number(e.target.value))))}
                  className="w-full px-2 py-1 text-center bg-white/5 border border-white/10 rounded text-white text-sm"
                />
              </div>
              <span className="text-white/50 text-sm">회</span>
            </div>
            <p className="text-xs text-white/40">질문당 GPT에 {openaiIterations}회 질문합니다.</p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10" />

        {/* Timeout */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/70">⏱️ API 타임아웃</label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="5"
              max="120"
              value={timeoutSeconds}
              onChange={(e) => setTimeoutSeconds(Math.min(120, Math.max(5, Number(e.target.value))))}
              className="w-24 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
            />
            <span className="text-white/50 text-sm">초</span>
          </div>
          <p className="text-xs text-white/40">각 API 호출의 최대 대기 시간입니다.</p>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10" />

        {/* Credit Example */}
        <div className="p-4 bg-primary-500/10 rounded-xl border border-primary-500/20">
          <div className="flex items-start gap-2">
            <Info size={16} className="text-primary-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-primary-300 mb-2">💰 크레딧 계산 예시</p>
              <div className="text-primary-300/70 space-y-1">
                <p>
                  {exampleQuestions}개 질문 × (Gemini {geminiIterations}회 + GPT {openaiIterations}회)
                </p>
                <p>
                  = {exampleQuestions} × ({geminiIterations}×{CREDIT_COSTS.gemini} + {openaiIterations}×{CREDIT_COSTS.openai}) = <span className="font-bold text-primary-300">{creditEstimate.totalCredits} 크레딧</span>
                </p>
                <p className="text-xs mt-2">
                  예상 소요 시간: {durationEstimate.formattedMin} ~ {durationEstimate.formattedMax}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Question Sets Link */}
        <Link
          href="/settings/question-sets"
          className="flex items-center justify-between p-4 bg-white/[0.03] rounded-xl border border-white/10 hover:bg-white/[0.06] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-500/20">
              <List size={20} className="text-primary-400" weight="fill" />
            </div>
            <div>
              <p className="text-white font-medium">질문 세트 관리</p>
              <p className="text-xs text-white/50">스캔할 질문 세트를 만들고 관리하세요</p>
            </div>
          </div>
          <CaretRight size={20} className="text-white/40" weight="bold" />
        </Link>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isUpdating}
            className="min-w-[100px]"
          >
            {isUpdating ? (
              <CircleNotch size={16} weight="bold" className="animate-spin mr-2" />
            ) : saved ? (
              <Check size={16} weight="bold" className="mr-2" />
            ) : null}
            {saved ? '저장됨' : '저장'}
          </Button>
        </div>
      </div>
    </div>
  );
}
