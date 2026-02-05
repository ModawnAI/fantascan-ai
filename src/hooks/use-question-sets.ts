'use client';

import useSWR, { mutate } from 'swr';
import useSWRMutation from 'swr/mutation';
import { fetcher, postFetcher, getPaginatedKey } from '@/lib/swr';
import type {
  QuestionSet,
  QuestionSetWithItems,
  QuestionSetItem,
  CreateQuestionSetInput,
  UpdateQuestionSetInput,
  AddQuestionItemInput,
  UpdateQuestionItemInput,
  ReorderQuestionsInput,
} from '@/types/batch-scan';
import { useCallback } from 'react';

// ============================================
// API Endpoints
// ============================================

const API = {
  questionSets: '/api/question-sets',
  questionSet: (id: string) => `/api/question-sets/${id}`,
  questionSetItems: (id: string) => `/api/question-sets/${id}/items`,
};

// ============================================
// Response Types
// ============================================

interface QuestionSetsResponse {
  sets: (QuestionSet & { question_count: number })[];
  pagination: {
    limit: number;
    offset: number;
    total: number | null;
  };
}

interface QuestionSetResponse {
  set: QuestionSetWithItems;
}

interface QuestionItemResponse {
  item: QuestionSetItem;
}

interface QuestionItemsResponse {
  items: QuestionSetItem[];
}

// ============================================
// Hooks: 질문 세트 목록
// ============================================

interface UseQuestionSetsParams {
  limit?: number;
  offset?: number;
  activeOnly?: boolean;
}

export function useQuestionSets(params: UseQuestionSetsParams = {}) {
  const key = getPaginatedKey(API.questionSets, {
    limit: params.limit ?? 20,
    offset: params.offset ?? 0,
    active_only: params.activeOnly ?? true,
  });

  const { data, error, isLoading, isValidating } = useSWR<QuestionSetsResponse>(
    key,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  );

  return {
    sets: data?.sets ?? [],
    pagination: data?.pagination,
    isLoading,
    isValidating,
    error,
    mutate: () => mutate(key),
  };
}

// ============================================
// Hooks: 단일 질문 세트
// ============================================

export function useQuestionSet(id: string | null) {
  const { data, error, isLoading, isValidating } = useSWR<QuestionSetResponse>(
    id ? API.questionSet(id) : null,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    set: data?.set,
    items: data?.set?.items ?? [],
    isLoading,
    isValidating,
    error,
    mutate: () => id && mutate(API.questionSet(id)),
  };
}

// ============================================
// Hooks: 질문 세트 생성
// ============================================

export function useCreateQuestionSet() {
  const { trigger, isMutating, error, data, reset } = useSWRMutation<
    { set: QuestionSetWithItems },
    Error,
    string,
    CreateQuestionSetInput
  >(API.questionSets, (url, { arg }) => postFetcher(url, arg));

  const createQuestionSet = useCallback(
    async (input: CreateQuestionSetInput) => {
      const result = await trigger(input);

      // Revalidate list
      await mutate(
        (key) => typeof key === 'string' && key.startsWith(API.questionSets),
        undefined,
        { revalidate: true }
      );

      return result;
    },
    [trigger]
  );

  return {
    createQuestionSet,
    isCreating: isMutating,
    error,
    data,
    reset,
  };
}

// ============================================
// Hooks: 질문 세트 수정
// ============================================

export function useUpdateQuestionSet(id: string) {
  const { trigger, isMutating, error, data, reset } = useSWRMutation<
    { set: QuestionSet },
    Error,
    string,
    UpdateQuestionSetInput
  >(API.questionSet(id), (url, { arg }) =>
    fetcher(url, { method: 'PATCH', body: JSON.stringify(arg) })
  );

  const updateQuestionSet = useCallback(
    async (input: UpdateQuestionSetInput) => {
      const result = await trigger(input);

      // Revalidate single and list
      await mutate(API.questionSet(id));
      await mutate(
        (key) => typeof key === 'string' && key.startsWith(API.questionSets),
        undefined,
        { revalidate: true }
      );

      return result;
    },
    [id, trigger]
  );

  return {
    updateQuestionSet,
    isUpdating: isMutating,
    error,
    data,
    reset,
  };
}

// ============================================
// Hooks: 질문 세트 삭제
// ============================================

export function useDeleteQuestionSet(id: string) {
  const { trigger, isMutating, error, reset } = useSWRMutation(
    API.questionSet(id),
    (url) => fetcher(url, { method: 'DELETE' })
  );

  const deleteQuestionSet = useCallback(async () => {
    await trigger();

    // Revalidate list
    await mutate(
      (key) => typeof key === 'string' && key.startsWith(API.questionSets),
      undefined,
      { revalidate: true }
    );
  }, [trigger]);

  return {
    deleteQuestionSet,
    isDeleting: isMutating,
    error,
    reset,
  };
}

// ============================================
// Hooks: 질문 항목 추가
// ============================================

export function useAddQuestionItem(questionSetId: string) {
  const { trigger, isMutating, error, data, reset } = useSWRMutation<
    QuestionItemResponse,
    Error,
    string,
    AddQuestionItemInput
  >(API.questionSetItems(questionSetId), (url, { arg }) =>
    postFetcher(url, arg)
  );

  const addItem = useCallback(
    async (input: AddQuestionItemInput) => {
      const result = await trigger(input);

      // Revalidate question set
      await mutate(API.questionSet(questionSetId));

      return result;
    },
    [questionSetId, trigger]
  );

  return {
    addItem,
    isAdding: isMutating,
    error,
    data,
    reset,
  };
}

// ============================================
// Hooks: 질문 항목 수정
// ============================================

export function useUpdateQuestionItem(questionSetId: string) {
  const { trigger, isMutating, error, data, reset } = useSWRMutation<
    QuestionItemResponse,
    Error,
    string,
    { itemId: string } & UpdateQuestionItemInput
  >(API.questionSetItems(questionSetId), (url, { arg }) =>
    fetcher(url, { method: 'PATCH', body: JSON.stringify(arg) })
  );

  const updateItem = useCallback(
    async (itemId: string, input: UpdateQuestionItemInput) => {
      const result = await trigger({ itemId, ...input });

      // Revalidate question set
      await mutate(API.questionSet(questionSetId));

      return result;
    },
    [questionSetId, trigger]
  );

  return {
    updateItem,
    isUpdating: isMutating,
    error,
    data,
    reset,
  };
}

// ============================================
// Hooks: 질문 항목 삭제
// ============================================

export function useDeleteQuestionItem(questionSetId: string) {
  const deleteItem = useCallback(
    async (itemId: string) => {
      const url = `${API.questionSetItems(questionSetId)}?itemId=${itemId}`;
      await fetcher(url, { method: 'DELETE' });

      // Revalidate question set
      await mutate(API.questionSet(questionSetId));
    },
    [questionSetId]
  );

  return {
    deleteItem,
  };
}

// ============================================
// Hooks: 질문 순서 변경
// ============================================

export function useReorderQuestionItems(questionSetId: string) {
  const { trigger, isMutating, error, data, reset } = useSWRMutation<
    QuestionItemsResponse,
    Error,
    string,
    ReorderQuestionsInput
  >(API.questionSetItems(questionSetId), (url, { arg }) =>
    fetcher(url, { method: 'PUT', body: JSON.stringify(arg) })
  );

  const reorderItems = useCallback(
    async (items: Array<{ id: string; order_index: number }>) => {
      const result = await trigger({ items });

      // Revalidate question set
      await mutate(API.questionSet(questionSetId));

      return result;
    },
    [questionSetId, trigger]
  );

  return {
    reorderItems,
    isReordering: isMutating,
    error,
    data,
    reset,
  };
}

// ============================================
// Export all
// ============================================

export {
  API as QUESTION_SET_API,
};
