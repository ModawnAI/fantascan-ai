'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Play } from '@phosphor-icons/react';
import { GlowingButton } from '@/components/ui/moving-border';
import type { ProviderType } from '@/types/database';
import { PROVIDER_DISPLAY } from '@/types/database';

interface ProviderGridProps {
  providerScores: Record<ProviderType, number> | null;
  brandId: string;
}

const PROVIDERS: { id: ProviderType; name: string; color: string; icon: string }[] = [
  { id: 'gemini', ...PROVIDER_DISPLAY.gemini },
  { id: 'openai', ...PROVIDER_DISPLAY.openai },
  { id: 'anthropic', ...PROVIDER_DISPLAY.anthropic },
  { id: 'grok', ...PROVIDER_DISPLAY.grok },
  { id: 'perplexity', ...PROVIDER_DISPLAY.perplexity },
];

export function ProviderGrid({ providerScores, brandId }: ProviderGridProps) {
  const router = useRouter();

  const handleStartScan = () => {
    router.push(`/scan/new?brand=${brandId}`);
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-medium text-white/60">
          AI 제공자별 점수
        </h3>
        <GlowingButton>
          <button
            onClick={handleStartScan}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-full transition-colors"
          >
            <Play size={16} weight="fill" />
            새 스캔
          </button>
        </GlowingButton>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {PROVIDERS.map((provider, index) => {
          const score = providerScores?.[provider.id] ?? null;

          return (
            <motion.div
              key={provider.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-6 h-6 flex items-center justify-center rounded text-white text-xs font-bold"
                  style={{ backgroundColor: provider.color }}
                >
                  {provider.icon}
                </span>
                <span className="text-sm font-medium text-white/80">
                  {provider.name}
                </span>
              </div>
              <div className="text-2xl font-bold" style={{ color: provider.color }}>
                {score !== null ? score : '--'}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
