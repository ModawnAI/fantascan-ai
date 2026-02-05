import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { ArrowLeft, List } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { QuestionSetList } from '@/components/question-sets';

export const metadata = {
  title: '질문 세트 관리 | FantaScan AI',
  description: '질문 세트를 관리하고 배치 스캔을 준비하세요.',
};

async function QuestionSetsPageContent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-white/5 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/settings"
              className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft size={16} weight="bold" />
              설정으로 돌아가기
            </Link>
            <div className="flex items-center gap-2 text-lg font-semibold text-white">
              <List size={20} weight="fill" className="text-primary-400" />
              질문 세트 관리
            </div>
            <div className="w-[140px]" /> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <QuestionSetList />
      </main>
    </div>
  );
}

export default function QuestionSetsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="animate-pulse text-white/50">로딩 중...</div>
      </div>
    }>
      <QuestionSetsPageContent />
    </Suspense>
  );
}
