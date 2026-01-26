import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';

export const metadata: Metadata = {
  title: '온보딩 - 판타스캔 AI',
  description: '브랜드를 등록하고 시작하세요',
};

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user already has a brand
  const { data: brands } = await supabase
    .from('brands')
    .select('id')
    .eq('user_id', user.id)
    .limit(1);

  // If user already has brands, redirect to dashboard
  if (brands && brands.length > 0) {
    redirect('/dashboard');
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <span className="text-3xl font-bold text-primary-400">판타스캔</span>
          <span className="text-3xl font-bold text-white"> AI</span>
          <p className="mt-2 text-white/60">
            브랜드를 등록하고 AI 가시성 모니터링을 시작하세요
          </p>
        </div>
        <OnboardingWizard />
      </div>
    </div>
  );
}
