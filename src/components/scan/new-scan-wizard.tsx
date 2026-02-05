'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MagnifyingGlass,
  Sparkle,
  Lightning,
  Stack,
  Play,
  CircleNotch,
  Info,
  Eye,
  Coins,
  CheckCircle,
  ArrowRight,
  Sliders,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ProviderType, Brand } from '@/types/database';
import { CREDIT_COSTS, PROVIDER_DISPLAY } from '@/types/database';
import type { DerivedQuery, ExpansionLevel } from '@/services/query-expansion/types';
import { DerivedQueriesPreview } from './derived-queries-preview';

interface NewScanWizardProps {
  brand: Brand;
  credits: number;
  onStartScan: (data: {
    baseQuery: string;
    expansionLevel: ExpansionLevel;
    providers: ProviderType[];
    derivedQueries: DerivedQuery[];
  }) => Promise<void>;
  onCancel?: () => void;
}

const EXPANSION_LEVELS: Array<{
  value: ExpansionLevel;
  label: string;
  description: string;
  queriesRange: string;
  icon: typeof Sparkle;
}> = [
  {
    value: 'minimal',
    label: '최소',
    description: '핵심 의도만 포함',
    queriesRange: '4-5개',
    icon: Lightning,
  },
  {
    value: 'standard',
    label: '표준',
    description: '균형잡힌 쿼리 세트',
    queriesRange: '8-10개',
    icon: Stack,
  },
  {
    value: 'comprehensive',
    label: '포괄',
    description: '가능한 모든 변형 포함',
    queriesRange: '12-15개',
    icon: Sparkle,
  },
];

const PROVIDERS: Array<{
  id: ProviderType;
  name: string;
  color: string;
  credits: number;
}> = [
  { id: 'gemini', name: 'Gemini', color: PROVIDER_DISPLAY.gemini.color, credits: CREDIT_COSTS.gemini },
  { id: 'openai', name: 'ChatGPT', color: PROVIDER_DISPLAY.openai.color, credits: CREDIT_COSTS.openai },
  { id: 'anthropic', name: 'Claude', color: PROVIDER_DISPLAY.anthropic.color, credits: CREDIT_COSTS.anthropic },
  { id: 'perplexity', name: 'Perplexity', color: PROVIDER_DISPLAY.perplexity.color, credits: CREDIT_COSTS.perplexity },
  { id: 'grok', name: 'Grok', color: PROVIDER_DISPLAY.grok.color, credits: CREDIT_COSTS.grok },
];

export function NewScanWizard({
  brand,
  credits,
  onStartScan,
  onCancel,
}: NewScanWizardProps) {
  const [step, setStep] = useState<'config' | 'preview'>('config');
  const [baseQuery, setBaseQuery] = useState('');
  const [expansionLevel, setExpansionLevel] = useState<ExpansionLevel>('standard');
  const [selectedProviders, setSelectedProviders] = useState<ProviderType[]>([
    'gemini',
    'openai',
    'anthropic',
  ]);
  const [derivedQueries, setDerivedQueries] = useState<DerivedQuery[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate estimated credits
  const estimatedQueriesCount = {
    minimal: 5,
    standard: 9,
    comprehensive: 13,
  }[expansionLevel];

  const creditsPerProvider = selectedProviders.reduce(
    (sum, p) => sum + (CREDIT_COSTS[p] || 2),
    0
  );

  const totalEstimatedCredits = estimatedQueriesCount * creditsPerProvider;
  const actualCredits =
    derivedQueries.length > 0
      ? (derivedQueries.length + 1) * creditsPerProvider
      : totalEstimatedCredits;

  const hasEnoughCredits = credits >= actualCredits;

  const toggleProvider = (providerId: ProviderType) => {
    setSelectedProviders((prev) =>
      prev.includes(providerId)
        ? prev.filter((p) => p !== providerId)
        : [...prev, providerId]
    );
    // Reset preview when providers change
    if (derivedQueries.length > 0) {
      setDerivedQueries([]);
      setStep('config');
    }
  };

  const handleGeneratePreview = useCallback(async () => {
    if (!baseQuery.trim() || selectedProviders.length === 0) {
      setError('검색어와 최소 1개의 AI 제공자를 선택해주세요');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/scans/batch/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: brand.id,
          baseQuery: baseQuery.trim(),
          expansionLevel,
          providers: selectedProviders,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '쿼리 생성 실패');
      }

      const { derivedQueries: queries } = await response.json();
      setDerivedQueries(queries);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : '쿼리 생성 중 오류가 발생했습니다');
    } finally {
      setIsGenerating(false);
    }
  }, [baseQuery, brand.id, expansionLevel, selectedProviders]);

  const handleRemoveQuery = useCallback((index: number) => {
    setDerivedQueries((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleEditQuery = useCallback((index: number, newQuery: string) => {
    setDerivedQueries((prev) =>
      prev.map((q, i) => (i === index ? { ...q, query: newQuery } : q))
    );
  }, []);

  const handleStartScan = async () => {
    if (!hasEnoughCredits) {
      setError('크레딧이 부족합니다');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onStartScan({
        baseQuery: baseQuery.trim(),
        expansionLevel,
        providers: selectedProviders,
        derivedQueries,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '스캔 시작 중 오류가 발생했습니다');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MagnifyingGlass size={28} weight="duotone" className="text-primary-400" />
            새 배치 스캔
          </h1>
          <p className="text-white/50 mt-1">
            {brand.name}의 AI 가시성을 종합적으로 분석합니다
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
              step === 'config' ? 'bg-primary-500/20 text-primary-400' : 'bg-white/5 text-white/40'
            }`}
          >
            <Sliders size={16} weight="duotone" />
            <span className="text-sm font-medium">설정</span>
          </div>
          <ArrowRight size={16} className="text-white/20" />
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
              step === 'preview' ? 'bg-primary-500/20 text-primary-400' : 'bg-white/5 text-white/40'
            }`}
          >
            <Eye size={16} weight="duotone" />
            <span className="text-sm font-medium">미리보기</span>
          </div>
        </div>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-400/10 text-red-400 rounded-xl text-sm border border-red-400/20 flex items-start gap-2"
          >
            <Info size={18} weight="fill" className="flex-shrink-0 mt-0.5" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {step === 'config' ? (
          <motion.div
            key="config"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Base Query Input */}
            <div id="query-input" className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center gap-2 mb-1">
                  <MagnifyingGlass size={18} weight="duotone" className="text-primary-400" />
                  <h2 className="text-lg font-semibold text-white">기본 검색어</h2>
                </div>
                <p className="text-sm text-white/50">
                  AI에게 물어볼 기본 질문을 입력하세요. 이 질문을 기반으로 다양한 변형 쿼리가 생성됩니다.
                </p>
              </div>
              <div className="p-6">
                <Input
                  placeholder={`예: ${brand.name} 추천해주세요, 좋은 ${brand.name} 어디서 구매하나요?`}
                  value={baseQuery}
                  onChange={(e) => setBaseQuery(e.target.value)}
                  className="text-base"
                />
              </div>
            </div>

            {/* Expansion Level */}
            <div id="expansion-selector" className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkle size={18} weight="duotone" className="text-primary-400" />
                  <h2 className="text-lg font-semibold text-white">확장 수준</h2>
                </div>
                <p className="text-sm text-white/50">
                  기본 검색어에서 생성할 변형 쿼리의 수준을 선택하세요
                </p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-3 gap-3">
                  {EXPANSION_LEVELS.map((level) => {
                    const isSelected = expansionLevel === level.value;
                    const IconComponent = level.icon;
                    return (
                      <button
                        key={level.value}
                        type="button"
                        onClick={() => setExpansionLevel(level.value)}
                        className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                          isSelected
                            ? 'border-primary-500 bg-primary-500/10'
                            : 'border-white/10 hover:border-white/20 bg-white/5'
                        }`}
                      >
                        {isSelected && (
                          <CheckCircle
                            size={20}
                            weight="fill"
                            className="absolute top-3 right-3 text-primary-400"
                          />
                        )}
                        <IconComponent
                          size={24}
                          weight="duotone"
                          className={isSelected ? 'text-primary-400' : 'text-white/60'}
                        />
                        <h3 className="mt-2 font-semibold text-white">{level.label}</h3>
                        <p className="text-xs text-white/50 mt-1">{level.description}</p>
                        <p className="text-xs text-primary-400 mt-2 font-medium">
                          {level.queriesRange} 쿼리
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Provider Selection */}
            <div id="provider-checkboxes" className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center gap-2 mb-1">
                  <Lightning size={18} weight="duotone" className="text-primary-400" />
                  <h2 className="text-lg font-semibold text-white">AI 제공자</h2>
                </div>
                <p className="text-sm text-white/50">
                  질문을 보낼 AI 서비스를 선택하세요. 선택한 모든 제공자에게 각 쿼리가 전송됩니다.
                </p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {PROVIDERS.map((provider) => {
                    const isSelected = selectedProviders.includes(provider.id);
                    return (
                      <button
                        key={provider.id}
                        type="button"
                        onClick={() => toggleProvider(provider.id)}
                        className={`relative p-4 rounded-xl border-2 text-center transition-all ${
                          isSelected
                            ? 'border-primary-500 bg-primary-500/10'
                            : 'border-white/10 hover:border-white/20 bg-white/5'
                        }`}
                      >
                        {isSelected && (
                          <CheckCircle
                            size={16}
                            weight="fill"
                            className="absolute top-2 right-2 text-primary-400"
                          />
                        )}
                        <div
                          className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center text-white text-lg font-bold"
                          style={{ backgroundColor: provider.color }}
                        >
                          {PROVIDER_DISPLAY[provider.id].icon}
                        </div>
                        <p className="mt-2 text-sm font-medium text-white">
                          {provider.name}
                        </p>
                        <p className="text-xs text-white/50 mt-0.5">
                          {provider.credits} 크레딧/쿼리
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Credits Summary & Generate Button */}
            <div id="credit-estimation" className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm text-white/50">예상 크레딧</p>
                    <div className="flex items-center gap-2">
                      <Coins size={20} weight="fill" className="text-yellow-400" />
                      <span className="text-2xl font-bold text-white">
                        {totalEstimatedCredits}
                      </span>
                    </div>
                  </div>
                  <div className="h-10 w-px bg-white/10" />
                  <div>
                    <p className="text-sm text-white/50">보유 크레딧</p>
                    <span
                      className={`text-2xl font-bold ${
                        hasEnoughCredits ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {credits}
                    </span>
                  </div>
                </div>

                <Button
                  id="start-scan-button"
                  onClick={handleGeneratePreview}
                  disabled={
                    !baseQuery.trim() ||
                    selectedProviders.length === 0 ||
                    isGenerating
                  }
                  className="gap-2"
                >
                  {isGenerating ? (
                    <CircleNotch size={18} weight="bold" className="animate-spin" />
                  ) : (
                    <Eye size={18} weight="fill" />
                  )}
                  쿼리 미리보기 생성
                </Button>
              </div>

              {!hasEnoughCredits && (
                <div className="flex items-start gap-2 p-3 bg-yellow-400/10 rounded-lg border border-yellow-400/20">
                  <Info size={16} weight="fill" className="text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-400">
                    예상 크레딧이 부족합니다. 제공자 수를 줄이거나 확장 수준을 낮춰주세요.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {/* Preview Component */}
            <DerivedQueriesPreview
              baseQuery={baseQuery}
              derivedQueries={derivedQueries}
              providers={selectedProviders}
              creditsPerProvider={creditsPerProvider}
              onRemoveQuery={handleRemoveQuery}
              onEditQuery={handleEditQuery}
              onBack={() => setStep('config')}
            />

            {/* Action Buttons */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm text-white/50">총 크레딧</p>
                    <div className="flex items-center gap-2">
                      <Coins size={20} weight="fill" className="text-yellow-400" />
                      <span className="text-2xl font-bold text-white">{actualCredits}</span>
                    </div>
                  </div>
                  <div className="h-10 w-px bg-white/10" />
                  <div>
                    <p className="text-sm text-white/50">총 쿼리</p>
                    <span className="text-2xl font-bold text-primary-400">
                      {derivedQueries.length + 1}
                    </span>
                  </div>
                  <div className="h-10 w-px bg-white/10" />
                  <div>
                    <p className="text-sm text-white/50">AI 제공자</p>
                    <span className="text-2xl font-bold text-blue-400">
                      {selectedProviders.length}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={onCancel}>
                    취소
                  </Button>
                  <Button
                    onClick={handleStartScan}
                    disabled={isSubmitting || !hasEnoughCredits}
                    className="gap-2"
                  >
                    {isSubmitting ? (
                      <CircleNotch size={18} weight="bold" className="animate-spin" />
                    ) : (
                      <Play size={18} weight="fill" />
                    )}
                    배치 스캔 시작
                  </Button>
                </div>
              </div>

              {!hasEnoughCredits && (
                <div className="flex items-start gap-2 p-3 mt-4 bg-red-400/10 rounded-lg border border-red-400/20">
                  <Info size={16} weight="fill" className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400">
                    크레딧이 부족합니다. 일부 쿼리를 제거하거나 크레딧을 충전해주세요.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
