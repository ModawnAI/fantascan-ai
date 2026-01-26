'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkle, CaretRight } from '@phosphor-icons/react';
import type { QueryTemplate, QueryType } from '@/types/database';

interface QueryTemplatesProps {
  templates: QueryTemplate[];
  brandId: string;
  brandName: string;
}

const QUERY_TYPE_LABELS: Record<QueryType, { label: string }> = {
  recommendation: { label: '추천' },
  comparison: { label: '비교' },
  review: { label: '리뷰' },
  ranking: { label: '순위' },
};

const DEFAULT_QUERY_TYPE = { label: '기타' };

export function QueryTemplates({ templates, brandId, brandName }: QueryTemplatesProps) {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<QueryType | 'all'>('all');

  const filteredTemplates = selectedType === 'all'
    ? templates
    : templates.filter((t) => t.query_type === selectedType);

  const handleSelectTemplate = (template: QueryTemplate) => {
    // Replace {brand} placeholder with actual brand name
    const query = template.template_ko.replace(/{brand}/g, brandName);
    router.push(`/scan/new?brand=${brandId}&query=${encodeURIComponent(query)}`);
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkle size={16} weight="fill" className="text-primary-400" />
        <h3 className="text-base font-medium text-white/60">
          추천 질문
        </h3>
      </div>

      {/* Query Type Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedType('all')}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            selectedType === 'all'
              ? 'bg-primary-500 text-white'
              : 'text-white/60 hover:bg-white/10'
          }`}
        >
          전체
        </button>
        {Object.entries(QUERY_TYPE_LABELS).map(([type, { label }]) => (
          <button
            key={type}
            onClick={() => setSelectedType(type as QueryType)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              selectedType === type
                ? 'bg-primary-500 text-white'
                : 'text-white/60 hover:bg-white/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Template List */}
      <div className="space-y-2 max-h-[240px] overflow-y-auto">
        {filteredTemplates.length > 0 ? (
          filteredTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => handleSelectTemplate(template)}
              className="w-full text-left p-3 rounded-xl bg-white/5 border border-white/10 hover:border-primary-500/50 hover:bg-white/10 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <span className="text-xs px-1.5 py-0.5 bg-white/10 text-white/60 rounded mr-2">
                    {(QUERY_TYPE_LABELS[template.query_type] || DEFAULT_QUERY_TYPE).label}
                  </span>
                  <p className="mt-1 text-sm text-white/80 truncate">
                    {template.template_ko.replace(/{brand}/g, brandName)}
                  </p>
                </div>
                <CaretRight size={16} weight="bold" className="text-white/40 group-hover:text-primary-400 ml-2 flex-shrink-0" />
              </div>
            </button>
          ))
        ) : (
          <p className="text-sm text-white/50 text-center py-4">
            질문 템플릿이 없습니다
          </p>
        )}
      </div>
    </div>
  );
}
