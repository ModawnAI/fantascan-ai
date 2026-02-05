'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ListBullets,
  MagnifyingGlass,
  Pencil,
  Trash,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Funnel,
  SortAscending,
  CaretDown,
  Target,
  Lightning,
  Coins,
} from '@phosphor-icons/react';
import type { ProviderType } from '@/types/database';
import { PROVIDER_DISPLAY } from '@/types/database';
import type { DerivedQuery, QueryExpansionType } from '@/services/query-expansion/types';

interface DerivedQueriesPreviewProps {
  baseQuery: string;
  derivedQueries: DerivedQuery[];
  providers: ProviderType[];
  creditsPerProvider: number;
  onRemoveQuery: (index: number) => void;
  onEditQuery: (index: number, newQuery: string) => void;
  onBack: () => void;
}

const QUERY_TYPE_DISPLAY: Record<
  QueryExpansionType,
  { label: string; color: string; bgColor: string }
> = {
  intent_variation: {
    label: '의도 변형',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
  },
  specificity: {
    label: '구체화',
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
  },
  price_focus: {
    label: '가격/가성비',
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
  },
  alternative: {
    label: '대안 탐색',
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/10',
  },
  comparison: {
    label: '비교',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-400/10',
  },
  review: {
    label: '후기/리뷰',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
  },
  ranking: {
    label: '순위/랭킹',
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
  },
  feature_specific: {
    label: '기능 특화',
    color: 'text-pink-400',
    bgColor: 'bg-pink-400/10',
  },
};

const LIKELIHOOD_DISPLAY = {
  high: {
    label: '높음',
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
    borderColor: 'border-green-400/20',
  },
  medium: {
    label: '중간',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    borderColor: 'border-yellow-400/20',
  },
  low: {
    label: '낮음',
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
    borderColor: 'border-red-400/20',
  },
};

type SortOption = 'relevance' | 'type' | 'likelihood';
type FilterType = QueryExpansionType | 'all';
type FilterLikelihood = 'high' | 'medium' | 'low' | 'all';

export function DerivedQueriesPreview({
  baseQuery,
  derivedQueries,
  providers,
  creditsPerProvider,
  onRemoveQuery,
  onEditQuery,
  onBack,
}: DerivedQueriesPreviewProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterLikelihood, setFilterLikelihood] = useState<FilterLikelihood>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Get unique query types from derived queries
  const availableTypes = useMemo(() => {
    const types = new Set<QueryExpansionType>();
    derivedQueries.forEach((q) => types.add(q.type));
    return Array.from(types);
  }, [derivedQueries]);

  // Filter and sort queries
  const processedQueries = useMemo(() => {
    let result = [...derivedQueries];

    // Filter by type
    if (filterType !== 'all') {
      result = result.filter((q) => q.type === filterType);
    }

    // Filter by likelihood
    if (filterLikelihood !== 'all') {
      result = result.filter((q) => q.expectedBrandMentionLikelihood === filterLikelihood);
    }

    // Sort
    switch (sortBy) {
      case 'relevance':
        result.sort((a, b) => b.relevanceScore - a.relevanceScore);
        break;
      case 'type':
        result.sort((a, b) => a.type.localeCompare(b.type));
        break;
      case 'likelihood':
        const likelihoodOrder = { high: 0, medium: 1, low: 2 };
        result.sort(
          (a, b) =>
            likelihoodOrder[a.expectedBrandMentionLikelihood] -
            likelihoodOrder[b.expectedBrandMentionLikelihood]
        );
        break;
    }

    return result;
  }, [derivedQueries, filterType, filterLikelihood, sortBy]);

  // Stats
  const stats = useMemo(() => {
    const highLikelihood = derivedQueries.filter(
      (q) => q.expectedBrandMentionLikelihood === 'high'
    ).length;
    const mediumLikelihood = derivedQueries.filter(
      (q) => q.expectedBrandMentionLikelihood === 'medium'
    ).length;
    const avgRelevance =
      derivedQueries.length > 0
        ? derivedQueries.reduce((sum, q) => sum + q.relevanceScore, 0) /
          derivedQueries.length
        : 0;

    return {
      totalQueries: derivedQueries.length + 1, // +1 for base query
      highLikelihood,
      mediumLikelihood,
      lowLikelihood: derivedQueries.length - highLikelihood - mediumLikelihood,
      avgRelevance: Math.round(avgRelevance * 100),
      totalCredits: (derivedQueries.length + 1) * creditsPerProvider,
    };
  }, [derivedQueries, creditsPerProvider]);

  const startEditing = (index: number, currentQuery: string) => {
    setEditingIndex(index);
    setEditText(currentQuery);
  };

  const saveEdit = () => {
    if (editingIndex !== null && editText.trim()) {
      onEditQuery(editingIndex, editText.trim());
      setEditingIndex(null);
      setEditText('');
    }
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditText('');
  };

  const getOriginalIndex = (query: DerivedQuery): number => {
    return derivedQueries.findIndex((q) => q.query === query.query);
  };

  return (
    <div className="space-y-4">
      {/* Header with Back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <ArrowLeft size={16} weight="bold" />
          설정으로 돌아가기
        </button>

        <div className="flex items-center gap-2">
          {/* Provider badges */}
          {providers.map((p) => (
            <div
              key={p}
              className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: PROVIDER_DISPLAY[p].color }}
              title={PROVIDER_DISPLAY[p].name}
            >
              {PROVIDER_DISPLAY[p].icon}
            </div>
          ))}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4">
          <div className="flex items-center gap-2 text-white/40 mb-1">
            <ListBullets size={14} weight="duotone" />
            <span className="text-xs">총 쿼리</span>
          </div>
          <p className="text-xl font-bold text-white">{stats.totalQueries}</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4">
          <div className="flex items-center gap-2 text-white/40 mb-1">
            <Target size={14} weight="duotone" />
            <span className="text-xs">높은 언급 가능성</span>
          </div>
          <p className="text-xl font-bold text-green-400">{stats.highLikelihood}</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4">
          <div className="flex items-center gap-2 text-white/40 mb-1">
            <Lightning size={14} weight="duotone" />
            <span className="text-xs">평균 관련도</span>
          </div>
          <p className="text-xl font-bold text-primary-400">{stats.avgRelevance}%</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4">
          <div className="flex items-center gap-2 text-white/40 mb-1">
            <Coins size={14} weight="duotone" />
            <span className="text-xs">예상 크레딧</span>
          </div>
          <p className="text-xl font-bold text-yellow-400">{stats.totalCredits}</p>
        </div>
      </div>

      {/* Main Preview Card */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
        {/* Card Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MagnifyingGlass size={18} weight="duotone" className="text-primary-400" />
            <h3 className="text-base font-semibold text-white">생성된 쿼리 미리보기</h3>
            <span className="text-xs text-white/40 ml-2">
              {processedQueries.length}개 표시 / {derivedQueries.length}개 중
            </span>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              showFilters
                ? 'bg-primary-500/20 text-primary-400'
                : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <Funnel size={14} weight="duotone" />
            필터
            <CaretDown
              size={12}
              weight="bold"
              className={`transition-transform ${showFilters ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-white/10 overflow-hidden"
            >
              <div className="p-4 space-y-4">
                {/* Sort */}
                <div>
                  <label className="text-xs text-white/40 mb-2 flex items-center gap-1">
                    <SortAscending size={12} />
                    정렬 기준
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'relevance' as const, label: '관련도' },
                      { value: 'type' as const, label: '유형' },
                      { value: 'likelihood' as const, label: '언급 가능성' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setSortBy(option.value)}
                        className={`px-3 py-1 text-xs rounded-full transition-colors ${
                          sortBy === option.value
                            ? 'bg-primary-500 text-white'
                            : 'bg-white/10 text-white/60 hover:bg-white/20'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filter by Type */}
                <div>
                  <label className="text-xs text-white/40 mb-2 flex items-center gap-1">
                    <Funnel size={12} />
                    쿼리 유형
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setFilterType('all')}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        filterType === 'all'
                          ? 'bg-primary-500 text-white'
                          : 'bg-white/10 text-white/60 hover:bg-white/20'
                      }`}
                    >
                      전체
                    </button>
                    {availableTypes.map((type) => {
                      const display = QUERY_TYPE_DISPLAY[type];
                      return (
                        <button
                          key={type}
                          onClick={() => setFilterType(type)}
                          className={`px-3 py-1 text-xs rounded-full transition-colors ${
                            filterType === type
                              ? `${display.bgColor} ${display.color}`
                              : 'bg-white/10 text-white/60 hover:bg-white/20'
                          }`}
                        >
                          {display.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Filter by Likelihood */}
                <div>
                  <label className="text-xs text-white/40 mb-2 flex items-center gap-1">
                    <Target size={12} />
                    언급 가능성
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setFilterLikelihood('all')}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        filterLikelihood === 'all'
                          ? 'bg-primary-500 text-white'
                          : 'bg-white/10 text-white/60 hover:bg-white/20'
                      }`}
                    >
                      전체
                    </button>
                    {(['high', 'medium', 'low'] as const).map((level) => {
                      const display = LIKELIHOOD_DISPLAY[level];
                      return (
                        <button
                          key={level}
                          onClick={() => setFilterLikelihood(level)}
                          className={`px-3 py-1 text-xs rounded-full transition-colors ${
                            filterLikelihood === level
                              ? `${display.bgColor} ${display.color}`
                              : 'bg-white/10 text-white/60 hover:bg-white/20'
                          }`}
                        >
                          {display.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Base Query */}
        <div className="p-4 border-b border-white/10 bg-primary-500/5">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
              <MagnifyingGlass size={14} weight="bold" className="text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-primary-400">기본 쿼리</span>
              </div>
              <p className="text-sm text-white font-medium">{baseQuery}</p>
            </div>
          </div>
        </div>

        {/* Query List */}
        <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
          <AnimatePresence>
            {processedQueries.map((query, displayIndex) => {
              const originalIndex = getOriginalIndex(query);
              const typeDisplay = QUERY_TYPE_DISPLAY[query.type];
              const likelihoodDisplay =
                LIKELIHOOD_DISPLAY[query.expectedBrandMentionLikelihood];
              const isEditing = editingIndex === originalIndex;

              return (
                <motion.div
                  key={`${query.query}-${originalIndex}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -50, height: 0 }}
                  transition={{ delay: displayIndex * 0.02 }}
                  className="p-4 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Number badge */}
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 text-xs text-white/60 font-medium">
                      {originalIndex + 1}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Badges row */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${typeDisplay.bgColor} ${typeDisplay.color}`}
                        >
                          {typeDisplay.label}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full border ${likelihoodDisplay.bgColor} ${likelihoodDisplay.color} ${likelihoodDisplay.borderColor}`}
                        >
                          언급 {likelihoodDisplay.label}
                        </span>
                        <span className="text-xs text-white/40">
                          관련도: {Math.round(query.relevanceScore * 100)}%
                        </span>
                      </div>

                      {/* Query text */}
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full px-3 py-2 bg-white/10 border border-primary-500/50 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit();
                              if (e.key === 'Escape') cancelEdit();
                            }}
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={saveEdit}
                              className="flex items-center gap-1 px-3 py-1 text-xs bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                            >
                              <CheckCircle size={12} weight="fill" />
                              저장
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="flex items-center gap-1 px-3 py-1 text-xs bg-white/10 text-white/60 rounded-lg hover:bg-white/20 transition-colors"
                            >
                              <XCircle size={12} weight="fill" />
                              취소
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-white/80">{query.query}</p>
                      )}

                      {/* Intent */}
                      {!isEditing && query.intent && (
                        <p className="text-xs text-white/40 mt-1">
                          의도: {query.intent}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    {!isEditing && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => startEditing(originalIndex, query.query)}
                          className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                          title="수정"
                        >
                          <Pencil size={14} weight="duotone" />
                        </button>
                        <button
                          onClick={() => onRemoveQuery(originalIndex)}
                          className="p-2 text-white/40 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                          title="삭제"
                        >
                          <Trash size={14} weight="duotone" />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {processedQueries.length === 0 && (
            <div className="p-8 text-center text-white/40">
              <Funnel size={32} weight="duotone" className="mx-auto mb-2" />
              <p className="text-sm">필터 조건에 맞는 쿼리가 없습니다</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
