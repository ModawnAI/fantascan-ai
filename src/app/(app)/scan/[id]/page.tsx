import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ScanResults } from '@/components/scan/scan-results';

export const metadata: Metadata = {
  title: '스캔 결과 - 판타스캔 AI',
  description: 'AI 가시성 스캔 결과',
};

interface ScanPageProps {
  params: Promise<{ id: string }>;
}

export default async function ScanPage({ params }: ScanPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get scan with results
  const { data: scan } = await supabase
    .from('scans')
    .select(`
      *,
      brands (*),
      scan_queries (*),
      scan_results (*),
      insights (*)
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!scan) {
    notFound();
  }

  return <ScanResults scan={scan} />;
}
