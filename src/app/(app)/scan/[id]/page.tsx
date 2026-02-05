'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { ArrowLeft, CircleNotch } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import { ScanResults } from '@/components/scan/scan-results';
import { BatchScanDetail } from '@/components/scan/batch-scan-detail';

function ScanPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const id = params.id as string;
  const typeParam = searchParams.get('type');
  
  const [scanType, setScanType] = useState<'batch' | 'legacy' | null>(null);
  const [legacyScan, setLegacyScan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const detectScanType = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // If type is specified, use it
      if (typeParam === 'batch') {
        setScanType('batch');
        setLoading(false);
        return;
      }

      // First, try to find in batch_scans_v2
      const { data: batchScan } = await supabase
        .from('batch_scans_v2')
        .select('id')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (batchScan) {
        setScanType('batch');
        setLoading(false);
        return;
      }

      // Try legacy scans table
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

      if (scan) {
        setScanType('legacy');
        setLegacyScan(scan);
        setLoading(false);
        return;
      }

      // Also try batch_scans (old table)
      const { data: oldBatchScan } = await supabase
        .from('batch_scans')
        .select('id')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (oldBatchScan) {
        // Redirect to legacy batch scan results
        setScanType('legacy');
        // Fetch the batch scan data
        const { data: batchData } = await supabase
          .from('batch_scans')
          .select('*')
          .eq('id', id)
          .single();
        
        if (batchData) {
          setLegacyScan(batchData);
        }
        setLoading(false);
        return;
      }

      // Not found
      router.push('/dashboard');
    };

    detectScanType();
  }, [id, typeParam, router]);

  if (loading) {
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
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft size={16} weight="bold" />
              대시보드
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {scanType === 'batch' ? (
          <BatchScanDetail scanId={id} />
        ) : scanType === 'legacy' && legacyScan ? (
          <ScanResults scan={legacyScan} />
        ) : null}
      </main>
    </>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <CircleNotch size={32} weight="bold" className="animate-spin text-primary-500" />
      </div>
    }>
      <ScanPageContent />
    </Suspense>
  );
}
