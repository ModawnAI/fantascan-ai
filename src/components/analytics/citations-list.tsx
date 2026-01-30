'use client';

import { motion } from 'motion/react';
import { Link as LinkIcon, Globe, ArrowSquareOut } from '@phosphor-icons/react';
import type { Citation } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';
import { PROVIDER_DISPLAY } from '@/types/database';

interface CitationsListProps {
  citations: Citation[];
  summary?: {
    total: number;
    topDomains: Array<{ domain: string; count: number }>;
    byProvider: Array<{ provider: string; count: number }>;
  };
  isLoading: boolean;
}

export function CitationsList({ citations, summary, isLoading }: CitationsListProps) {
  if (isLoading) {
    return (
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (citations.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-2 text-white/60 mb-4">
          <LinkIcon size={20} weight="duotone" />
          <h3 className="font-medium">인용된 소스</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-white/40">
          <Globe size={48} weight="thin" />
          <p className="mt-2 text-sm">아직 인용된 소스가 없습니다</p>
          <p className="text-xs">Perplexity, Google 검색에서 인용이 발견되면 표시됩니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-white/60">
          <LinkIcon size={20} weight="duotone" />
          <h3 className="font-medium">인용된 소스</h3>
        </div>
        <span className="text-xs text-white/40">{summary?.total || citations.length}개</span>
      </div>

      {/* Top Domains Summary */}
      {summary && summary.topDomains.length > 0 && (
        <div className="mb-4 pb-4 border-b border-white/10">
          <p className="text-xs text-white/40 mb-2">자주 인용된 도메인</p>
          <div className="flex flex-wrap gap-2">
            {summary.topDomains.slice(0, 5).map((d, i) => (
              <motion.span
                key={d.domain}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="px-2 py-1 bg-white/5 rounded-lg text-xs text-white/70"
              >
                {d.domain} ({d.count})
              </motion.span>
            ))}
          </div>
        </div>
      )}

      {/* Citations List */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {citations.slice(0, 20).map((citation, index) => {
          const providerInfo = PROVIDER_DISPLAY[citation.provider as keyof typeof PROVIDER_DISPLAY];
          
          return (
            <motion.a
              key={citation.id}
              href={citation.source_url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group"
            >
              {/* Favicon placeholder */}
              <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center flex-shrink-0">
                <Globe size={16} className="text-white/40" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate group-hover:text-orange-400 transition-colors">
                  {citation.source_title || citation.source_domain || '알 수 없는 소스'}
                </p>
                <p className="text-xs text-white/40 truncate">
                  {citation.source_domain}
                </p>
              </div>

              {/* Provider badge */}
              {providerInfo && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${providerInfo.color}20`, color: providerInfo.color }}
                >
                  {providerInfo.name}
                </span>
              )}

              {/* External link icon */}
              <ArrowSquareOut size={14} className="text-white/40 group-hover:text-white/60 transition-colors flex-shrink-0" />
            </motion.a>
          );
        })}
      </div>

      {/* Show more indicator */}
      {citations.length > 20 && (
        <div className="mt-3 text-center">
          <span className="text-xs text-white/40">
            +{citations.length - 20}개 더 있음
          </span>
        </div>
      )}
    </div>
  );
}
