'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { X, CircleNotch } from '@phosphor-icons/react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import type { IndustryType } from '@/types/database';

const INDUSTRIES: { value: IndustryType; label: string }[] = [
  { value: 'fintech', label: '핀테크/금융' },
  { value: 'ecommerce', label: '이커머스/쇼핑몰' },
  { value: 'saas', label: 'SaaS/소프트웨어' },
  { value: 'education', label: '교육/에듀테크' },
  { value: 'healthcare', label: '헬스케어/의료' },
  { value: 'fnb', label: 'F&B/식음료' },
  { value: 'beauty', label: '뷰티/화장품' },
  { value: 'travel', label: '여행/관광' },
  { value: 'realestate', label: '부동산' },
  { value: 'other', label: '기타' },
];

interface FormData {
  name: string;
  description: string;
  industry: IndustryType | '';
  keywords: string[];
  competitors: string[];
}

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    industry: '',
    keywords: [],
    competitors: [],
  });
  const [keywordInput, setKeywordInput] = useState('');
  const [competitorInput, setCompetitorInput] = useState('');

  const totalSteps = 3;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const addKeyword = () => {
    if (keywordInput.trim() && formData.keywords.length < 10) {
      setFormData({
        ...formData,
        keywords: [...formData.keywords, keywordInput.trim()],
      });
      setKeywordInput('');
    }
  };

  const removeKeyword = (index: number) => {
    setFormData({
      ...formData,
      keywords: formData.keywords.filter((_, i) => i !== index),
    });
  };

  const addCompetitor = () => {
    if (competitorInput.trim() && formData.competitors.length < 5) {
      setFormData({
        ...formData,
        competitors: [...formData.competitors, competitorInput.trim()],
      });
      setCompetitorInput('');
    }
  };

  const removeCompetitor = (index: number) => {
    setFormData({
      ...formData,
      competitors: formData.competitors.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.industry) {
      setError('브랜드명과 업종은 필수입니다');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { error: insertError } = await supabase.from('brands').insert({
        user_id: user.id,
        name: formData.name,
        description: formData.description || null,
        industry: formData.industry,
        keywords: formData.keywords,
        competitors: formData.competitors,
        is_primary: true,
      });

      if (insertError) {
        setError(insertError.message);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('브랜드 등록 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.name.trim().length > 0;
      case 2:
        return formData.industry !== '';
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">브랜드 등록</h2>
          <span className="text-sm text-white/50">
            {step} / {totalSteps}
          </span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2">
          <div
            className="bg-primary-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      </div>
      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 text-sm text-red-400 bg-red-400/10 rounded-lg border border-red-400/20">
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-white/50 mb-6">
                  먼저 모니터링할 브랜드 정보를 입력해주세요
                </p>

                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium text-white/70">
                    브랜드명 *
                  </label>
                  <input
                    id="name"
                    placeholder="예: 삼성전자, 네이버, 토스"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium text-white/70">
                    브랜드 설명 (선택)
                  </label>
                  <input
                    id="description"
                    placeholder="브랜드에 대한 간단한 설명"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-colors"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-white/50 mb-6">
                  브랜드의 업종을 선택해주세요. 업종에 맞는 질문 템플릿이 제공됩니다.
                </p>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70">업종 선택 *</label>
                  <Select
                    value={formData.industry}
                    onValueChange={(value: IndustryType) =>
                      setFormData({ ...formData, industry: value })
                    }
                  >
                    <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="업종을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/10">
                      {INDUSTRIES.map((industry) => (
                        <SelectItem
                          key={industry.value}
                          value={industry.value}
                          className="text-white hover:bg-white/10"
                        >
                          {industry.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <p className="text-sm text-white/50 mb-6">
                  관련 키워드와 경쟁사를 입력하면 더 정확한 분석이 가능합니다 (선택사항)
                </p>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70">관련 키워드 (최대 10개)</label>
                  <div className="flex gap-2">
                    <input
                      placeholder="키워드 입력"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addKeyword();
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={addKeyword}
                      className="px-4 py-2 text-sm font-medium text-white/70 border border-white/20 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      추가
                    </button>
                  </div>
                  {formData.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.keywords.map((keyword, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-primary-500/20 text-primary-400 rounded-md text-sm"
                        >
                          {keyword}
                          <button
                            type="button"
                            onClick={() => removeKeyword(index)}
                            className="hover:text-primary-300"
                          >
                            <X size={14} weight="bold" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70">경쟁사 (최대 5개)</label>
                  <div className="flex gap-2">
                    <input
                      placeholder="경쟁사명 입력"
                      value={competitorInput}
                      onChange={(e) => setCompetitorInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCompetitor();
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={addCompetitor}
                      className="px-4 py-2 text-sm font-medium text-white/70 border border-white/20 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      추가
                    </button>
                  </div>
                  {formData.competitors.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.competitors.map((competitor, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-white/10 text-white/70 rounded-md text-sm"
                        >
                          {competitor}
                          <button
                            type="button"
                            onClick={() => removeCompetitor(index)}
                            className="hover:text-white"
                          >
                            <X size={14} weight="bold" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between mt-8">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 1}
            className="px-4 py-2 text-sm font-medium text-white/70 border border-white/20 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            이전
          </button>
          {step < totalSteps ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed()}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              다음
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50 rounded-lg transition-colors"
            >
              {loading && <CircleNotch size={16} weight="bold" className="animate-spin" />}
              시작하기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
