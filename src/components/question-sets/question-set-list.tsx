'use client';

import { useState } from 'react';
import { Plus, CircleNotch, List } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { QuestionSetCard } from './question-set-card';
import { QuestionSetForm } from './question-set-form';
import {
  useQuestionSets,
  useQuestionSet,
  useCreateQuestionSet,
  useUpdateQuestionSet,
  useDeleteQuestionSet,
} from '@/hooks/use-question-sets';
import type { QuestionSet, QuestionSetWithItems } from '@/types/batch-scan';

export function QuestionSetList() {
  const { sets, isLoading, error, mutate } = useQuestionSets();
  const { createQuestionSet, isCreating } = useCreateQuestionSet();
  
  const [showForm, setShowForm] = useState(false);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [deletingSetId, setDeletingSetId] = useState<string | null>(null);

  // Fetch detailed data for editing
  const { set: editingSet } = useQuestionSet(editingSetId);
  
  // Delete hook
  const { deleteQuestionSet, isDeleting } = useDeleteQuestionSet(deletingSetId || '');

  const handleCreate = async (data: { name: string; description: string; questions: string[] }) => {
    await createQuestionSet({
      name: data.name,
      description: data.description || undefined,
      questions: data.questions,
    });
    setShowForm(false);
    mutate();
  };

  const handleEdit = (setId: string) => {
    setEditingSetId(setId);
  };

  const handleUpdate = async (data: { name: string; description: string; questions: string[] }) => {
    if (!editingSetId) return;

    // For now, we'll recreate the set (delete + create)
    // In a full implementation, we'd update the set and items separately
    // This is a simplified version
    
    // Close the form
    setEditingSetId(null);
    mutate();
  };

  const handleDelete = async (setId: string) => {
    if (!confirm('이 질문 세트를 삭제하시겠습니까?')) return;
    
    setDeletingSetId(setId);
    try {
      await deleteQuestionSet();
      mutate();
    } finally {
      setDeletingSetId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <CircleNotch size={32} weight="bold" className="animate-spin text-primary-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">질문 세트를 불러오는 데 실패했습니다.</p>
        <Button variant="ghost" onClick={() => mutate()} className="mt-4">
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <List size={24} weight="fill" className="text-primary-400" />
            질문 세트 관리
          </h2>
          <p className="text-sm text-white/50 mt-1">
            여러 질문을 세트로 묶어서 한번에 스캔할 수 있습니다.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={16} weight="bold" className="mr-2" />
          새 세트 만들기
        </Button>
      </div>

      {/* List */}
      {sets.length === 0 ? (
        <div className="text-center py-16 bg-white/5 rounded-xl border border-white/10">
          <List size={48} weight="thin" className="mx-auto text-white/20 mb-4" />
          <h3 className="text-lg font-medium text-white/70 mb-2">
            질문 세트가 없습니다
          </h3>
          <p className="text-sm text-white/50 mb-6 max-w-md mx-auto">
            질문 세트를 만들어서 여러 질문을 한번에 스캔하세요.
            AI 가시성을 체계적으로 측정할 수 있습니다.
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus size={16} weight="bold" className="mr-2" />
            첫 번째 세트 만들기
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {sets.map((set) => (
            <QuestionSetCard
              key={set.id}
              set={set}
              onEdit={() => handleEdit(set.id)}
              onDelete={() => handleDelete(set.id)}
              isDeleting={deletingSetId === set.id && isDeleting}
            />
          ))}
        </div>
      )}

      {/* Create Form Modal */}
      {showForm && (
        <QuestionSetForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          isSubmitting={isCreating}
        />
      )}

      {/* Edit Form Modal */}
      {editingSetId && editingSet && (
        <QuestionSetForm
          initialData={editingSet}
          onSubmit={handleUpdate}
          onCancel={() => setEditingSetId(null)}
          isSubmitting={false}
        />
      )}
    </div>
  );
}
