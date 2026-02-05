'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CircleNotch } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import type { Brand } from '@/types/database';
import { BatchScanWizard } from '@/components/scan/batch-scan-wizard';

function ScanNewPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const brandId = searchParams.get('brand');

  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // First try to get scan settings default brand
      const { data: settings } = await supabase
        .from('user_scan_settings')
        .select('default_brand_id')
        .eq('user_id', user.id)
        .single();

      const targetBrandId = brandId || settings?.default_brand_id;

      if (targetBrandId) {
        const { data: brandData } = await supabase
          .from('brands')
          .select('*')
          .eq('id', targetBrandId)
          .eq('user_id', user.id)
          .single();

        if (brandData) {
          setBrand(brandData);
          setLoading(false);
          return;
        }
      }

      // Fallback to primary brand
      const { data: primaryBrand } = await supabase
        .from('brands')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .single();

      if (primaryBrand) {
        setBrand(primaryBrand);
        setLoading(false);
        return;
      }

      // No brand found, redirect to onboarding
      router.push('/onboarding');
    };

    fetchData();
  }, [brandId, router]);

  if (loading || !brand) {
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

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <BatchScanWizard brand={brand} />
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
