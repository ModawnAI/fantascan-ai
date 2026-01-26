import type { Metadata, Viewport } from 'next';
import { SWRProvider } from '@/components/providers/swr-provider';
import { ServiceWorkerProvider } from '@/components/providers/service-worker-provider';
import { OfflineIndicator } from '@/components/ui/offline-indicator';
import './globals.css';

export const metadata: Metadata = {
  title: '판타스캔 AI - AI 브랜드 가시성 모니터링',
  description: 'ChatGPT, Gemini, Claude 등 주요 AI 플랫폼에서 브랜드 가시성을 추적하는 AEO/GEO/SEO 모니터링 도구',
  keywords: ['AEO', 'GEO', 'SEO', 'AI 마케팅', '브랜드 모니터링', 'ChatGPT', 'Gemini', 'Claude'],
  authors: [{ name: 'Fantascan AI' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '판타스캔 AI',
  },
  openGraph: {
    title: '판타스캔 AI - AI 브랜드 가시성 모니터링',
    description: 'ChatGPT, Gemini, Claude 등 주요 AI 플랫폼에서 브랜드 가시성을 추적하세요',
    type: 'website',
    locale: 'ko_KR',
  },
};

export const viewport: Viewport = {
  themeColor: '#f97316',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="scroll-smooth">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <ServiceWorkerProvider>
          <SWRProvider>
            <OfflineIndicator />
            {children}
          </SWRProvider>
        </ServiceWorkerProvider>
      </body>
    </html>
  );
}
