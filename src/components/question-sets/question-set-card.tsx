'use client';

import { useState } from 'react';
import { 
  List, 
  PencilSimple, 
  Trash, 
  CaretDown, 
  CaretUp,
  Clock,
} from '@phosphor-icons/react';
import type { QuestionSet, QuestionSetItem } from '@/types/batch-scan';
import { Button } from '@/components/ui/button';

interface QuestionSetCardProps {
  set: QuestionSet & { question_count: number };
  items?: QuestionSetItem[];
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

export function QuestionSetCard({
  set,
  items,
  onEdit,
  onDelete,
  isDeleting,
}: QuestionSetCardProps) {
  const [expanded, setExpanded] = useState(false);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '사용 기록 없음';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '오늘';
    if (diffDays === 1) return '어제';
    if (diffDays < 7) return `${diffDays}일 전`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-primary-500/20">
              <List size={20} className="text-primary-400" weight="fill" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-white truncate">
                {set.name}
              </h3>
              <div className="flex items-center gap-3 mt-1 text-sm text-white/50">
                <span>질문 {set.question_count}개</span>
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {formatDate(set.last_used_at)}
                </span>
              </div>
              {set.description && (
                <p className="mt-2 text-sm text-white/60 line-clamp-2">
                  {set.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              <PencilSimple size={16} weight="bold" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={isDeleting}
              className="text-red-400/60 hover:text-red-400 hover:bg-red-400/10"
            >
              <Trash size={16} weight="bold" />
            </Button>
          </div>
        </div>

        {/* Expand/Collapse button */}
        {items && items.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 flex items-center gap-1 text-sm text-white/50 hover:text-white/70 transition-colors"
          >
            {expanded ? (
              <>
                <CaretUp size={14} weight="bold" />
                접기
              </>
            ) : (
              <>
                <CaretDown size={14} weight="bold" />
                질문 보기
              </>
            )}
          </button>
        )}
      </div>

      {/* Expanded questions list */}
      {expanded && items && items.length > 0 && (
        <div className="border-t border-white/10 px-4 py-3 bg-white/[0.02]">
          <ul className="space-y-2">
            {items.filter(item => item.is_active).map((item, index) => (
              <li 
                key={item.id} 
                className="flex items-start gap-2 text-sm text-white/70"
              >
                <span className="text-white/40 font-mono text-xs mt-0.5">
                  {index + 1}.
                </span>
                <span className="flex-1">{item.question_text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
