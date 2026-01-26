import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SettingsContent } from '@/components/settings/settings-content';

export const metadata: Metadata = {
  title: '설정 - 판타스캔 AI',
  description: '계정 및 브랜드 설정',
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  // Get user's primary brand
  const { data: brand } = await supabase
    .from('brands')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_primary', true)
    .single();

  if (!profile || !brand) {
    redirect('/onboarding');
  }

  // Get total scans count
  const { count: totalScans } = await supabase
    .from('scans')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  return (
    <SettingsContent
      user={{
        id: user.id,
        email: user.email || '',
      }}
      profile={profile}
      brand={brand}
      totalScans={totalScans || 0}
    />
  );
}
