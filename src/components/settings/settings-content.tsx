'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Buildings, CreditCard, SignOut, FloppyDisk, CircleNotch, ListChecks, Gear, CaretRight } from '@phosphor-icons/react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import type { User as DbUser, Brand, SubscriptionTier, IndustryType } from '@/types/database';
import { TIER_LIMITS } from '@/types/database';

interface SettingsContentProps {
  user: {
    id: string;
    email: string;
  };
  profile: DbUser;
  brand: Brand;
  totalScans: number;
}

const INDUSTRY_LABELS: Record<IndustryType, string> = {
  fintech: '핀테크',
  ecommerce: '이커머스',
  saas: 'SaaS',
  education: '교육',
  healthcare: '헬스케어',
  fnb: 'F&B',
  beauty: '뷰티',
  travel: '여행',
  realestate: '부동산',
  other: '기타',
};

const TIER_LABELS: Record<SubscriptionTier, { name: string; description: string }> = {
  free: { name: '무료', description: '월 100 크레딧' },
  starter: { name: '스타터', description: '월 500 크레딧' },
  pro: { name: '프로', description: '월 2,000 크레딧 + 일일 스캔' },
};

export function SettingsContent({ user, profile, brand, totalScans }: SettingsContentProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [brandName, setBrandName] = useState(brand.name);
  const [brandDescription, setBrandDescription] = useState(brand.description || '');
  const [industry, setIndustry] = useState<IndustryType>(brand.industry);
  const [keywords, setKeywords] = useState(brand.keywords.join(', '));
  const [competitors, setCompetitors] = useState(brand.competitors.join(', '));
  const [companyName, setCompanyName] = useState(profile.full_name || '');

  const handleSaveProfile = async () => {
    setLoading(true);
    const supabase = createClient();

    try {
      // Update user profile
      await supabase
        .from('users')
        .update({
          full_name: companyName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      // Update brand
      await supabase
        .from('brands')
        .update({
          name: brandName,
          description: brandDescription,
          industry,
          keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
          competitors: competitors.split(',').map((c) => c.trim()).filter(Boolean),
          updated_at: new Date().toISOString(),
        })
        .eq('id', brand.id);

      router.refresh();
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const tierLimits = TIER_LIMITS[profile.plan] || TIER_LIMITS.free;
  const creditsUsedPercent = Math.round(
    ((tierLimits.credits - profile.credits) / tierLimits.credits) * 100
  );

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
            <h1 className="text-lg font-semibold text-white">설정</h1>
            <button
              onClick={handleSaveProfile}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50 rounded-lg transition-colors"
            >
              {loading ? (
                <CircleNotch size={16} weight="bold" className="animate-spin" />
              ) : (
                <FloppyDisk size={16} weight="bold" />
              )}
              저장
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        {/* Quick Links Section */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-2 text-lg font-semibold text-white">
              <Gear size={20} weight="fill" />
              스캔 설정
            </div>
            <p className="text-sm text-white/50 mt-1">질문 세트 관리 및 스캔 옵션</p>
          </div>
          <div className="divide-y divide-white/5">
            <Link
              href="/settings/question-sets"
              className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                  <ListChecks size={20} weight="duotone" className="text-primary-400" />
                </div>
                <div>
                  <p className="font-medium text-white">질문 세트 관리</p>
                  <p className="text-sm text-white/50">스캔에 사용할 질문 세트 생성 및 편집</p>
                </div>
              </div>
              <CaretRight size={20} weight="bold" className="text-white/30 group-hover:text-white/60" />
            </Link>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Gear size={20} weight="duotone" className="text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">스캔 반복 횟수</p>
                  <p className="text-sm text-white/50">Gemini 50회, GPT 50회 (기본값)</p>
                </div>
              </div>
              <p className="text-xs text-white/40 mt-2 ml-13">
                * 질문 세트 페이지 또는 스캔 시작 시 조절 가능
              </p>
            </div>
          </div>
        </div>

        {/* Account Section */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-2 text-lg font-semibold text-white">
              <User size={20} weight="fill" />
              계정 정보
            </div>
            <p className="text-sm text-white/50 mt-1">로그인 및 회사 정보</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">이메일</label>
              <input
                value={user.email}
                disabled
                className="w-full px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-white/50 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="company-name" className="text-sm font-medium text-white/70">회사명</label>
              <input
                id="company-name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="회사명을 입력하세요"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Brand Section */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-2 text-lg font-semibold text-white">
              <Buildings size={20} weight="fill" />
              브랜드 정보
            </div>
            <p className="text-sm text-white/50 mt-1">AI 가시성 모니터링 대상 브랜드</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label htmlFor="brand-name" className="text-sm font-medium text-white/70">브랜드명</label>
              <input
                id="brand-name"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="브랜드명을 입력하세요"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="brand-description" className="text-sm font-medium text-white/70">브랜드 설명</label>
              <input
                id="brand-description"
                value={brandDescription}
                onChange={(e) => setBrandDescription(e.target.value)}
                placeholder="브랜드에 대한 간단한 설명"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="industry" className="text-sm font-medium text-white/70">산업군</label>
              <Select value={industry} onValueChange={(v) => setIndustry(v as IndustryType)}>
                <SelectTrigger id="industry" className="w-full bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/10">
                  {Object.entries(INDUSTRY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value} className="text-white hover:bg-white/10">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="keywords" className="text-sm font-medium text-white/70">핵심 키워드</label>
              <input
                id="keywords"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="키워드1, 키워드2, 키워드3"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-colors"
              />
              <p className="text-xs text-white/40">쉼표로 구분하여 입력하세요</p>
            </div>
            <div className="space-y-2">
              <label htmlFor="competitors" className="text-sm font-medium text-white/70">경쟁사</label>
              <input
                id="competitors"
                value={competitors}
                onChange={(e) => setCompetitors(e.target.value)}
                placeholder="경쟁사1, 경쟁사2, 경쟁사3"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-colors"
              />
              <p className="text-xs text-white/40">쉼표로 구분하여 입력하세요</p>
            </div>
          </div>
        </div>

        {/* Subscription Section */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-2 text-lg font-semibold text-white">
              <CreditCard size={20} weight="fill" />
              구독 및 크레딧
            </div>
            <p className="text-sm text-white/50 mt-1">현재 플랜과 사용량</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
              <div>
                <p className="font-medium text-white">
                  {(TIER_LABELS[profile.plan] || TIER_LABELS.free).name} 플랜
                </p>
                <p className="text-sm text-white/50">
                  {(TIER_LABELS[profile.plan] || TIER_LABELS.free).description}
                </p>
              </div>
              {profile.plan !== 'pro' && (
                <button className="px-3 py-1.5 text-sm font-medium text-white/70 border border-white/20 hover:bg-white/10 rounded-lg transition-colors">
                  업그레이드
                </button>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">크레딧 잔액</span>
                <span className="font-medium text-white">
                  {profile.credits} / {tierLimits.credits}
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (profile.credits / tierLimits.credits) * 100)}%` }}
                />
              </div>
            </div>

            <div className="border-t border-white/10 pt-4">
              <p className="text-sm text-white/60">총 스캔 횟수</p>
              <p className="text-2xl font-bold text-white">{totalScans}회</p>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-red-500/30 overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <div className="text-lg font-semibold text-red-400">로그아웃</div>
          </div>
          <div className="p-6">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-400 border border-red-400/30 hover:bg-red-400/10 rounded-lg transition-colors"
            >
              <SignOut size={16} weight="bold" />
              로그아웃
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
