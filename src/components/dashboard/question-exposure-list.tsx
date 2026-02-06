'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CaretDown,
  CaretUp,
  Question,
  Target,
  Robot,
  Sparkle,
} from '@phosphor-icons/react';

interface QuestionData {
  id: string;
  questionText: string;
  avgExposureRate: number | null;
  geminiExposureRate: number | null;
  openaiExposureRate: number | null;
  geminiMentions: number;
  openaiMentions: number;
  competitorMentions: Record<string, number>;
}

interface QuestionExposureListProps {
  questions: QuestionData[];
  brandName: string;
  configuredCompetitors: string[];
}

export function QuestionExposureList({
  questions,
  brandName,
  configuredCompetitors,
}: QuestionExposureListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'order' | 'exposure'>('order');

  const sortedQuestions = [...questions].sort((a, b) => {
    if (sortBy === 'exposure') {
      return (b.avgExposureRate || 0) - (a.avgExposureRate || 0);
    }
    return 0; // Keep original order
  });

  const getExposureColor = (rate: number | null) => {
    if (rate === null) return 'text-white/30';
    if (rate >= 50) return 'text-green-400';
    if (rate >= 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getExposureBgColor = (rate: number | null) => {
    if (rate === null) return 'bg-white/5';
    if (rate >= 50) return 'bg-green-400/10';
    if (rate >= 30) return 'bg-yellow-400/10';
    return 'bg-red-400/10';
  };

  if (questions.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Question size={20} weight="duotone" className="text-primary-400" />
          <h3 className="text-base font-medium text-white/60">질문별 노출도</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Question size={48} weight="duotone" className="text-white/20 mb-3" />
          <p className="text-white/50 text-sm">분석된 질문이 없습니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={20} weight="duotone" className="text-primary-400" />
          <h3 className="text-base font-medium text-white/60">질문별 AI 가시성 노출도</h3>
          <span className="text-xs text-white/30 bg-white/5 px-2 py-0.5 rounded-full">
            {questions.length}개 질문
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortBy(sortBy === 'order' ? 'exposure' : 'order')}
            className="text-xs text-white/50 hover:text-white/70 transition-colors flex items-center gap-1"
          >
            {sortBy === 'exposure' ? '노출도순' : '질문순'}
            <CaretDown size={12} />
          </button>
        </div>
      </div>

      {/* Question List */}
      <div className="divide-y divide-white/5">
        {sortedQuestions.map((question, index) => (
          <div key={question.id} className="group">
            {/* Question Row */}
            <button
              onClick={() => setExpandedId(expandedId === question.id ? null : question.id)}
              className="w-full px-4 py-3 flex items-center gap-4 hover:bg-white/5 transition-colors text-left"
            >
              {/* Index */}
              <span className="text-xs text-white/30 w-6 flex-shrink-0">
                {index + 1}
              </span>

              {/* Question Text */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/80 truncate">{question.questionText}</p>
              </div>

              {/* Provider Rates */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="flex items-center gap-1.5">
                  <Sparkle size={14} className="text-blue-400" />
                  <span className={`text-xs font-medium ${getExposureColor(question.geminiExposureRate)}`}>
                    {question.geminiExposureRate !== null ? `${question.geminiExposureRate.toFixed(0)}%` : '-'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Robot size={14} className="text-emerald-400" />
                  <span className={`text-xs font-medium ${getExposureColor(question.openaiExposureRate)}`}>
                    {question.openaiExposureRate !== null ? `${question.openaiExposureRate.toFixed(0)}%` : '-'}
                  </span>
                </div>
              </div>

              {/* Average Exposure */}
              <div className={`px-3 py-1 rounded-lg ${getExposureBgColor(question.avgExposureRate)} flex-shrink-0`}>
                <span className={`text-sm font-semibold ${getExposureColor(question.avgExposureRate)}`}>
                  {question.avgExposureRate !== null ? `${question.avgExposureRate.toFixed(1)}%` : '-'}
                </span>
              </div>

              {/* Expand Icon */}
              <motion.div
                animate={{ rotate: expandedId === question.id ? 180 : 0 }}
                className="text-white/30"
              >
                <CaretDown size={16} />
              </motion.div>
            </button>

            {/* Expanded Details */}
            <AnimatePresence>
              {expandedId === question.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden bg-white/[0.02]"
                >
                  <div className="px-4 py-4 pl-10 space-y-4">
                    {/* Provider Details */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkle size={16} className="text-blue-400" />
                          <span className="text-xs font-medium text-white/70">Gemini</span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className={`text-lg font-bold ${getExposureColor(question.geminiExposureRate)}`}>
                            {question.geminiExposureRate !== null ? `${question.geminiExposureRate.toFixed(1)}%` : '-'}
                          </span>
                          <span className="text-xs text-white/40">
                            {question.geminiMentions}회 언급
                          </span>
                        </div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Robot size={16} className="text-emerald-400" />
                          <span className="text-xs font-medium text-white/70">GPT</span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className={`text-lg font-bold ${getExposureColor(question.openaiExposureRate)}`}>
                            {question.openaiExposureRate !== null ? `${question.openaiExposureRate.toFixed(1)}%` : '-'}
                          </span>
                          <span className="text-xs text-white/40">
                            {question.openaiMentions}회 언급
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Competitor Mentions (only configured) */}
                    {configuredCompetitors.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-white/50 mb-2">경쟁사 언급</h4>
                        <div className="flex flex-wrap gap-2">
                          {configuredCompetitors.map(competitor => {
                            const mentions = question.competitorMentions[competitor] || 0;
                            const totalMentions = question.geminiMentions + question.openaiMentions;
                            const ratio = totalMentions > 0 ? (mentions / totalMentions) * 100 : 0;
                            
                            return (
                              <div
                                key={competitor}
                                className={`px-2 py-1 rounded text-xs ${
                                  mentions > 0 ? 'bg-orange-400/10 text-orange-400' : 'bg-white/5 text-white/30'
                                }`}
                              >
                                {competitor}: {mentions}회
                                {mentions > 0 && ratio > 0 && (
                                  <span className="text-white/40 ml-1">
                                    ({ratio.toFixed(0)}%)
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
