'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lightbulb,
  CheckCircle,
  Circle,
  CaretDown,
  CaretUp,
  Target,
  Code,
  Tag,
  ListChecks,
  Sparkle,
} from '@phosphor-icons/react';
import type { ContentRecommendation, RecommendationType, RecommendationPriority } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';

interface RecommendationsListProps {
  recommendations: ContentRecommendation[];
  isLoading: boolean;
  onUpdateStatus?: (id: string, status: string) => Promise<{ success: boolean }>;
}

const TYPE_CONFIG: Record<RecommendationType, { icon: typeof Lightbulb; label: string; color: string }> = {
  content: { icon: Lightbulb, label: '콘텐츠', color: 'text-blue-400' },
  schema: { icon: Code, label: '스키마', color: 'text-purple-400' },
  keyword: { icon: Tag, label: '키워드', color: 'text-green-400' },
  entity: { icon: Target, label: '엔티티', color: 'text-yellow-400' },
  structure: { icon: ListChecks, label: '구조', color: 'text-pink-400' },
  citation: { icon: Sparkle, label: '인용', color: 'text-cyan-400' },
};

const PRIORITY_CONFIG: Record<RecommendationPriority, { label: string; color: string; bgColor: string }> = {
  critical: { label: '긴급', color: 'text-red-400', bgColor: 'bg-red-500/20' },
  high: { label: '높음', color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  medium: { label: '보통', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  low: { label: '낮음', color: 'text-white/40', bgColor: 'bg-white/10' },
};

export function RecommendationsList({ recommendations, isLoading, onUpdateStatus }: RecommendationsListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleToggleComplete = async (rec: ContentRecommendation) => {
    if (!onUpdateStatus || updatingId) return;
    
    setUpdatingId(rec.id);
    const newStatus = rec.status === 'completed' ? 'pending' : 'completed';
    await onUpdateStatus(rec.id, newStatus);
    setUpdatingId(null);
  };

  if (isLoading) {
    return (
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-2 text-white/60 mb-4">
          <Lightbulb size={20} weight="duotone" />
          <h3 className="font-medium">개선 권장사항</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-white/40">
          <CheckCircle size={48} weight="thin" />
          <p className="mt-2 text-sm">모든 권장사항을 완료했습니다!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-white/60">
          <Lightbulb size={20} weight="duotone" />
          <h3 className="font-medium">개선 권장사항</h3>
        </div>
        <span className="text-xs text-white/40">{recommendations.length}개</span>
      </div>

      {/* List */}
      <div className="space-y-3">
        <AnimatePresence>
          {recommendations.map((rec, index) => {
            const typeConfig = TYPE_CONFIG[rec.recommendation_type];
            const priorityConfig = PRIORITY_CONFIG[rec.priority];
            const isExpanded = expandedId === rec.id;
            const Icon = typeConfig.icon;

            return (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.05 }}
                className={`rounded-lg border transition-colors ${
                  rec.status === 'completed'
                    ? 'bg-white/5 border-white/5 opacity-60'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                {/* Main row */}
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                >
                  {/* Checkbox */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleComplete(rec);
                    }}
                    disabled={!!updatingId}
                    className={`flex-shrink-0 transition-colors ${
                      rec.status === 'completed' ? 'text-green-400' : 'text-white/40 hover:text-white/60'
                    }`}
                  >
                    {updatingId === rec.id ? (
                      <Circle size={20} className="animate-pulse" />
                    ) : rec.status === 'completed' ? (
                      <CheckCircle size={20} weight="fill" />
                    ) : (
                      <Circle size={20} />
                    )}
                  </button>

                  {/* Type icon */}
                  <div className={`flex-shrink-0 ${typeConfig.color}`}>
                    <Icon size={18} weight="duotone" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      rec.status === 'completed' ? 'line-through text-white/40' : 'text-white'
                    }`}>
                      {rec.title}
                    </p>
                  </div>

                  {/* Priority badge */}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${priorityConfig.bgColor} ${priorityConfig.color}`}>
                    {priorityConfig.label}
                  </span>

                  {/* Expand icon */}
                  <div className="text-white/40">
                    {isExpanded ? <CaretUp size={16} /> : <CaretDown size={16} />}
                  </div>
                </div>

                {/* Expanded content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 pt-1 border-t border-white/5">
                        <p className="text-sm text-white/70 mb-3">{rec.description}</p>
                        
                        {/* Action items */}
                        {rec.action_items.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs text-white/40 font-medium">실행 항목:</p>
                            <ul className="space-y-1">
                              {rec.action_items.map((item, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-white/60">
                                  <span className="text-orange-400 mt-1">•</span>
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Impact & Effort */}
                        <div className="flex gap-4 mt-3">
                          {rec.estimated_impact && (
                            <div className="text-xs">
                              <span className="text-white/40">예상 효과: </span>
                              <span className={
                                rec.estimated_impact === 'high' ? 'text-green-400' :
                                rec.estimated_impact === 'medium' ? 'text-yellow-400' :
                                'text-white/60'
                              }>
                                {rec.estimated_impact === 'high' ? '높음' :
                                 rec.estimated_impact === 'medium' ? '보통' : '낮음'}
                              </span>
                            </div>
                          )}
                          {rec.estimated_effort && (
                            <div className="text-xs">
                              <span className="text-white/40">소요 시간: </span>
                              <span className="text-white/60">
                                {rec.estimated_effort === 'quick' ? '빠름' :
                                 rec.estimated_effort === 'moderate' ? '보통' : '상당함'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
