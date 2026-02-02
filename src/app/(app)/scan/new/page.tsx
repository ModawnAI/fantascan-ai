'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Play, Info, CircleNotch } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import type { ProviderType, Brand } from '@/types/database';
import { CREDIT_COSTS, PROVIDER_DISPLAY } from '@/types/database';

const PROVIDERS: { id: ProviderType; name: string; color: string; description: string; credits: number }[] = [
  { id: 'gemini', name: 'Google Gemini', color: PROVIDER_DISPLAY.gemini.color, description: 'Google의 최신 AI 모델', credits: CREDIT_COSTS.gemini },
  { id: 'openai', name: 'ChatGPT', color: PROVIDER_DISPLAY.openai.color, description: 'OpenAI의 GPT 모델', credits: CREDIT_COSTS.openai },
  { id: 'anthropic', name: 'Claude', color: PROVIDER_DISPLAY.anthropic.color, description: 'Anthropic의 Claude 모델', credits: CREDIT_COSTS.anthropic },
  { id: 'grok', name: 'Grok', color: PROVIDER_DISPLAY.grok.color, description: 'xAI의 Grok 모델', credits: CREDIT_COSTS.grok },
  { id: 'perplexity', name: 'Perplexity', color: PROVIDER_DISPLAY.perplexity.color, description: '실시간 검색 AI', credits: CREDIT_COSTS.perplexity },
];

function ScanNewPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const brandId = searchParams.get('brand');
  const initialQuery = searchParams.get('query') || '';

  const [brand, setBrand] = useState<Brand | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [selectedProviders, setSelectedProviders] = useState<ProviderType[]>(['gemini', 'openai', 'anthropic']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credits, setCredits] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Get brand
      if (brandId) {
        const { data: brandData } = await supabase
          .from('brands')
          .select('*')
          .eq('id', brandId)
          .eq('user_id', user.id)
          .single();

        if (brandData) {
          setBrand(brandData);
        } else {
          router.push('/dashboard');
        }
      }

      // Get credits
      const { data: profile } = await supabase
        .from('users')
        .select('credits')
        .eq('id', user.id)
        .single();

      if (profile) {
        setCredits(profile.credits);
      }
    };

    fetchData();
  }, [brandId, router]);

  const toggleProvider = (providerId: ProviderType) => {
    setSelectedProviders((prev) =>
      prev.includes(providerId)
        ? prev.filter((p) => p !== providerId)
        : [...prev, providerId]
    );
  };

  const totalCredits = selectedProviders.reduce((sum, p) => sum + CREDIT_COSTS[p], 0);

  const handleSubmit = async () => {
    if (!brand || !query.trim() || selectedProviders.length === 0) {
      setError('질문과 최소 1개의 AI 제공자를 선택해주세요');
      return;
    }

    if (totalCredits > credits) {
      setError('크레딧이 부족합니다');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: brand.id,
          query,
          providers: selectedProviders,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '스캔 생성 실패');
      }

      const { scanId } = await response.json();
      router.push(`/scan/${scanId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '스캔 생성 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  if (!brand) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CircleNotch size={32} weight="bold" className="animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <>
      <header className="bg-white/5 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="flex items-center h-16">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft size={16} weight="bold" />
              뒤로
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">새 스캔</h1>
          <p className="text-white/50">
            {brand.name}의 AI 가시성을 확인합니다
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-400/10 text-red-400 rounded-lg text-sm border border-red-400/20">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Query Input */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">검색 질문</h2>
              <p className="text-sm text-white/50 mt-1">
                AI에게 물어볼 질문을 입력하세요. {brand.name}이(가) 언급되는지 확인합니다.
              </p>
            </div>
            <div className="p-6">
              <div className="space-y-2">
                <label htmlFor="query" className="text-sm font-medium text-white/70">질문</label>
                <input
                  id="query"
                  placeholder={`예: ${brand.name} 추천해주세요`}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Provider Selection */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">AI 제공자 선택</h2>
              <p className="text-sm text-white/50 mt-1">
                질문을 보낼 AI 서비스를 선택하세요
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-3">
                {PROVIDERS.map((provider) => {
                  const isSelected = selectedProviders.includes(provider.id);
                  return (
                    <button
                      key={provider.id}
                      type="button"
                      onClick={() => toggleProvider(provider.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? 'border-primary-500 bg-primary-500/10'
                          : 'border-white/10 hover:border-white/20 bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className="text-sm font-medium"
                          style={{ color: provider.color }}
                        >
                          {provider.name}
                        </span>
                        <span className="text-xs text-white/50">
                          {provider.credits} 크레딧
                        </span>
                      </div>
                      <p className="text-xs text-white/50">
                        {provider.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Summary and Submit */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-white/50">필요 크레딧</p>
                  <p className="text-2xl font-bold text-white">{totalCredits}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-white/50">보유 크레딧</p>
                  <p className={`text-2xl font-bold ${totalCredits > credits ? 'text-red-400' : 'text-green-400'}`}>
                    {credits}
                  </p>
                </div>
              </div>

              {totalCredits > credits && (
                <div className="flex items-start gap-2 p-3 mb-4 bg-yellow-400/10 rounded-lg border border-yellow-400/20">
                  <Info size={16} weight="fill" className="text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-400">
                    크레딧이 부족합니다. 요금제를 업그레이드하거나 제공자 수를 줄여주세요.
                  </p>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading || !query.trim() || selectedProviders.length === 0 || totalCredits > credits}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 text-base font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
              >
                {loading ? (
                  <CircleNotch size={20} weight="bold" className="animate-spin" />
                ) : (
                  <Play size={20} weight="fill" />
                )}
                스캔 시작
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default function ScanNewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <CircleNotch size={32} weight="bold" className="animate-spin text-primary-500" />
      </div>
    }>
      <ScanNewPageContent />
    </Suspense>
  );
}
