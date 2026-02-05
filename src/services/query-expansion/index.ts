/**
 * Query Expansion Service
 * Main entry point for query expansion functionality
 */

import { expandWithTemplates } from './template-expander';
import { expandWithLLM, expandWithLLMAndFallback } from './llm-expander';
import type {
  QueryExpansionInput,
  QueryExpansionResult,
  DerivedQuery,
  ExpansionLevel,
  QueryExpansionType,
} from './types';
import { CREDIT_COSTS, type ProviderType } from '@/types/database';

// Re-export types
export type {
  QueryExpansionInput,
  QueryExpansionResult,
  DerivedQuery,
  ExpansionLevel,
  QueryExpansionType,
};

// Re-export template functions
export { expandWithTemplates } from './template-expander';
export { expandWithLLM } from './llm-expander';

/**
 * Main query expansion function
 * Combines template and LLM-based expansion for best results
 */
export async function expandQueries(
  input: QueryExpansionInput,
  options: {
    useLLM?: boolean;
    providers?: ProviderType[];
  } = {}
): Promise<QueryExpansionResult> {
  const { useLLM = true, providers = ['gemini', 'openai', 'anthropic', 'perplexity'] } = options;
  
  let derivedQueries: DerivedQuery[];
  
  if (useLLM) {
    // Use LLM with template fallback
    derivedQueries = await expandWithLLMAndFallback(input, expandWithTemplates);
  } else {
    // Use templates only
    derivedQueries = expandWithTemplates(input);
  }
  
  // Calculate estimated credits
  // Each derived query will be sent to each provider
  const creditsPerQuery = providers.reduce(
    (sum, p) => sum + (CREDIT_COSTS[p] || 2),
    0
  );
  const estimatedCredits = (derivedQueries.length + 1) * creditsPerQuery; // +1 for original query
  
  return {
    originalQuery: input.originalQuery,
    derivedQueries,
    totalQueries: derivedQueries.length + 1,
    estimatedCredits,
  };
}

/**
 * Quick expand using templates only (no API calls)
 */
export function quickExpand(input: QueryExpansionInput): QueryExpansionResult {
  const derivedQueries = expandWithTemplates(input);
  
  // Default providers for estimation
  const defaultProviders: ProviderType[] = ['gemini', 'openai', 'anthropic', 'perplexity'];
  const creditsPerQuery = defaultProviders.reduce(
    (sum, p) => sum + (CREDIT_COSTS[p] || 2),
    0
  );
  
  return {
    originalQuery: input.originalQuery,
    derivedQueries,
    totalQueries: derivedQueries.length + 1,
    estimatedCredits: (derivedQueries.length + 1) * creditsPerQuery,
  };
}

/**
 * Preview expansion without actually calling LLM
 * Useful for showing estimated queries before user confirms
 */
export function previewExpansion(
  input: QueryExpansionInput,
  providers: ProviderType[] = ['gemini', 'openai', 'anthropic', 'perplexity']
): {
  estimatedQueries: number;
  estimatedCredits: number;
  queryTypes: QueryExpansionType[];
} {
  const level = input.expansionLevel || 'standard';
  
  const queriesPerLevel = {
    minimal: 4,
    standard: 8,
    comprehensive: 12,
  };
  
  const typesPerLevel: Record<ExpansionLevel, QueryExpansionType[]> = {
    minimal: ['intent_variation', 'comparison', 'review', 'ranking'],
    standard: [
      'intent_variation',
      'comparison',
      'review',
      'ranking',
      'alternative',
      'price_focus',
    ],
    comprehensive: [
      'intent_variation',
      'comparison',
      'review',
      'ranking',
      'alternative',
      'price_focus',
      'specificity',
      'feature_specific',
    ],
  };
  
  const estimatedQueries = queriesPerLevel[level] + 1; // +1 for original
  const creditsPerQuery = providers.reduce(
    (sum, p) => sum + (CREDIT_COSTS[p] || 2),
    0
  );
  
  return {
    estimatedQueries,
    estimatedCredits: estimatedQueries * creditsPerQuery,
    queryTypes: typesPerLevel[level],
  };
}

/**
 * Group derived queries by type
 */
export function groupQueriesByType(
  queries: DerivedQuery[]
): Record<QueryExpansionType, DerivedQuery[]> {
  const grouped: Record<QueryExpansionType, DerivedQuery[]> = {
    intent_variation: [],
    specificity: [],
    price_focus: [],
    alternative: [],
    comparison: [],
    review: [],
    ranking: [],
    feature_specific: [],
  };
  
  for (const query of queries) {
    if (grouped[query.type]) {
      grouped[query.type].push(query);
    }
  }
  
  return grouped;
}

/**
 * Get display name for query type (Korean)
 */
export function getQueryTypeDisplayName(type: QueryExpansionType): string {
  const displayNames: Record<QueryExpansionType, string> = {
    intent_variation: '의도 변형',
    specificity: '구체화',
    price_focus: '가격/가성비',
    alternative: '대안 탐색',
    comparison: '비교',
    review: '후기/리뷰',
    ranking: '순위/랭킹',
    feature_specific: '기능 특화',
  };
  
  return displayNames[type] || type;
}

/**
 * Filter queries by minimum relevance score
 */
export function filterByRelevance(
  queries: DerivedQuery[],
  minScore: number = 0.5
): DerivedQuery[] {
  return queries.filter(q => q.relevanceScore >= minScore);
}
