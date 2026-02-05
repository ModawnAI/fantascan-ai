'use client';

import { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash, 
  DotsSixVertical,
  CircleNotch,
  Info,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import type { QuestionSetWithItems, QuestionSetItem } from '@/types/batch-scan';

interface QuestionSetFormProps {
  initialData?: QuestionSetWithItems;
  onSubmit: (data: { name: string; description: string; questions: string[] }) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function QuestionSetForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
}: QuestionSetFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [questions, setQuestions] = useState<string[]>(
    initialData?.items
      ?.filter(item => item.is_active)
      .sort((a, b) => a.order_index - b.order_index)
      .map(item => item.question_text) || ['']
  );
  const [newQuestion, setNewQuestion] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEdit = !!initialData;

  const addQuestion = () => {
    if (newQuestion.trim()) {
      if (questions.length >= 50) {
        setErrors({ ...errors, questions: '최대 50개의 질문까지 추가할 수 있습니다' });
        return;
      }
      setQuestions([...questions, newQuestion.trim()]);
      setNewQuestion('');
      setErrors({ ...errors, questions: '' });
    }
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, value: string) => {
    const updated = [...questions];
    updated[index] = value;
    setQuestions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = '세트 이름을 입력해주세요';
    }

    const validQuestions = questions.filter(q => q.trim());
    if (validQuestions.length === 0) {
      newErrors.questions = '최소 1개의 질문이 필요합니다';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await onSubmit({
      name: name.trim(),
      description: description.trim(),
      questions: validQuestions,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addQuestion();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">
            {isEdit ? '질문 세트 수정' : '새 질문 세트 만들기'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <label htmlFor="set-name" className="text-sm font-medium text-white/70">
                세트 이름 *
              </label>
              <input
                id="set-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrors({ ...errors, name: '' });
                }}
                placeholder="예: SaaS 추천 질문 세트"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-colors"
              />
              {errors.name && (
                <p className="text-xs text-red-400">{errors.name}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label htmlFor="set-description" className="text-sm font-medium text-white/70">
                설명 (선택)
              </label>
              <input
                id="set-description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="질문 세트에 대한 간단한 설명"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-colors"
              />
            </div>

            {/* Questions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-white/70">
                  질문 목록 ({questions.filter(q => q.trim()).length}/50)
                </label>
              </div>

              {/* Question list */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {questions.map((question, index) => (
                  <div key={index} className="flex items-start gap-2 group">
                    <div className="p-2 text-white/30 cursor-grab">
                      <DotsSixVertical size={16} weight="bold" />
                    </div>
                    <span className="text-white/40 text-sm mt-2 w-6">
                      {index + 1}.
                    </span>
                    <input
                      type="text"
                      value={question}
                      onChange={(e) => updateQuestion(index, e.target.value)}
                      placeholder="질문을 입력하세요"
                      className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => removeQuestion(index)}
                      className="p-2 text-white/30 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash size={16} weight="bold" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add new question */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="새 질문 입력..."
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-colors"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={addQuestion}
                  disabled={!newQuestion.trim() || questions.length >= 50}
                >
                  <Plus size={16} weight="bold" className="mr-1" />
                  추가
                </Button>
              </div>

              {errors.questions && (
                <p className="text-xs text-red-400">{errors.questions}</p>
              )}

              {/* Tips */}
              <div className="flex items-start gap-2 p-3 bg-primary-500/10 rounded-lg border border-primary-500/20">
                <Info size={16} className="text-primary-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-primary-300/80">
                  <p className="font-medium mb-1">💡 팁</p>
                  <p>
                    {'{브랜드명}'}, {'{경쟁사}'} 변수를 사용하면
                    스캔 시 실제 값으로 자동 치환됩니다.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 bg-white/[0.02]">
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <CircleNotch size={16} weight="bold" className="animate-spin mr-2" />
                  저장 중...
                </>
              ) : (
                '저장'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
