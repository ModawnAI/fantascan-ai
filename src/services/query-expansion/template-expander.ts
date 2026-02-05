/**
 * Template-based Query Expander
 * Generates derived queries using predefined templates
 */

import type {
  QueryExpansionInput,
  DerivedQuery,
  QueryExpansionType,
  TemplateExpansionConfig,
  ExpansionLevel,
} from './types';

// Template configurations for each query type
const EXPANSION_TEMPLATES: TemplateExpansionConfig[] = [
  // Intent variations
  {
    type: 'intent_variation',
    templates: [
      '{query}',
      '{query} 비교해줘',
      '{query} 알려줘',
      '{query} 설명해줘',
    ],
    intent: '의도 변형 - 같은 목적의 다른 표현',
    likelihood: 'high',
  },
  // Specificity
  {
    type: 'specificity',
    templates: [
      '스타트업용 {keyword} 추천',
      '대기업용 {keyword} 추천',
      '초보자를 위한 {keyword}',
      '전문가용 {keyword}',
      '소규모 팀을 위한 {keyword}',
    ],
    intent: '구체화 - 특정 사용 사례',
    likelihood: 'medium',
  },
  // Price focus
  {
    type: 'price_focus',
    templates: [
      '가성비 좋은 {keyword}',
      '저렴한 {keyword} 추천',
      '무료 {keyword} 있어?',
      '{keyword} 가격 비교',
      '합리적인 가격의 {keyword}',
    ],
    intent: '가격 관점 - 비용 중심 검색',
    likelihood: 'medium',
  },
  // Alternative
  {
    type: 'alternative',
    templates: [
      '{brand} 대안 추천해줘',
      '{brand} 대신 쓸만한 거 있어?',
      '{brand} 말고 다른 {keyword}',
      '{brand} 비슷한 서비스',
    ],
    intent: '대안 탐색 - 경쟁사 발견 기회',
    likelihood: 'high',
  },
  // Comparison
  {
    type: 'comparison',
    templates: [
      '{brand} vs {competitor} 비교',
      '{brand}랑 {competitor} 뭐가 나아?',
      '{brand} {competitor} 차이점',
      '{competitor}보다 {brand}가 나은 점',
    ],
    intent: '비교 쿼리 - 경쟁사 대비 위치',
    likelihood: 'high',
  },
  // Review
  {
    type: 'review',
    templates: [
      '{brand} 사용 후기',
      '{brand} 실제 사용해본 사람',
      '{brand} 장단점',
      '{brand} 평가',
      '{brand} 써본 경험',
    ],
    intent: '후기 쿼리 - 사회적 증거',
    likelihood: 'high',
  },
  // Ranking
  {
    type: 'ranking',
    templates: [
      '2024년 {keyword} 순위',
      '{keyword} 1위',
      '최고의 {keyword} top 5',
      '인기 {keyword} 순위',
      '{keyword} 베스트',
    ],
    intent: '순위 쿼리 - 권위 있는 위치',
    likelihood: 'medium',
  },
  // Feature specific
  {
    type: 'feature_specific',
    templates: [
      '협업 기능 좋은 {keyword}',
      '{keyword} 보안 좋은 거',
      '사용하기 쉬운 {keyword}',
      '기능 많은 {keyword}',
      '빠른 {keyword}',
    ],
    intent: '기능 특화 - 특정 기능 관심',
    likelihood: 'medium',
  },
];

// Number of queries per level
const QUERIES_PER_LEVEL: Record<ExpansionLevel, number> = {
  minimal: 4,
  standard: 8,
  comprehensive: 12,
};

// Types to include per level (in priority order)
const TYPES_BY_LEVEL: Record<ExpansionLevel, QueryExpansionType[]> = {
  minimal: ['intent_variation', 'comparison', 'review', 'ranking'],
  standard: [
    'intent_variation',
    'comparison',
    'review',
    'ranking',
    'alternative',
    'price_focus',
    'specificity',
    'feature_specific',
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

/**
 * Replace template placeholders with actual values
 */
function fillTemplate(
  template: string,
  input: QueryExpansionInput
): string {
  let result = template;
  
  // Replace placeholders
  result = result.replace(/{query}/g, input.originalQuery);
  result = result.replace(/{brand}/g, input.brandName);
  result = result.replace(/{keyword}/g, input.keywords[0] || input.originalQuery);
  
  // Replace competitor placeholder with first competitor or generic
  if (input.competitors.length > 0) {
    result = result.replace(/{competitor}/g, input.competitors[0]);
  } else {
    result = result.replace(/{competitor}/g, '경쟁사');
  }
  
  return result;
}

/**
 * Generate derived queries using templates
 */
export function expandWithTemplates(
  input: QueryExpansionInput
): DerivedQuery[] {
  const level = input.expansionLevel || 'standard';
  const maxQueries = QUERIES_PER_LEVEL[level];
  const allowedTypes = TYPES_BY_LEVEL[level];
  
  const derivedQueries: DerivedQuery[] = [];
  const usedQueries = new Set<string>();
  
  // Iterate through allowed types and templates
  for (const type of allowedTypes) {
    if (derivedQueries.length >= maxQueries) break;
    
    const config = EXPANSION_TEMPLATES.find(t => t.type === type);
    if (!config) continue;
    
    for (const template of config.templates) {
      if (derivedQueries.length >= maxQueries) break;
      
      const query = fillTemplate(template, input);
      
      // Skip duplicates and original query
      if (usedQueries.has(query.toLowerCase())) continue;
      if (query.toLowerCase() === input.originalQuery.toLowerCase()) continue;
      
      usedQueries.add(query.toLowerCase());
      
      derivedQueries.push({
        query,
        type: config.type,
        intent: config.intent,
        relevanceScore: calculateRelevanceScore(config.type, input),
        expectedBrandMentionLikelihood: config.likelihood,
      });
    }
  }
  
  // Sort by relevance score
  return derivedQueries.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Calculate relevance score based on query type and input
 */
function calculateRelevanceScore(
  type: QueryExpansionType,
  input: QueryExpansionInput
): number {
  // Base score by type
  const baseScores: Record<QueryExpansionType, number> = {
    intent_variation: 0.95,
    comparison: 0.90,
    review: 0.85,
    ranking: 0.80,
    alternative: 0.75,
    price_focus: 0.70,
    specificity: 0.65,
    feature_specific: 0.60,
  };
  
  let score = baseScores[type] || 0.5;
  
  // Boost for comparison if competitors exist
  if (type === 'comparison' && input.competitors.length > 0) {
    score += 0.05;
  }
  
  // Boost for specificity if keywords exist
  if (['specificity', 'feature_specific'].includes(type) && input.keywords.length > 0) {
    score += 0.05;
  }
  
  return Math.min(score, 1.0);
}

/**
 * Get all available expansion types
 */
export function getAvailableExpansionTypes(): QueryExpansionType[] {
  return EXPANSION_TEMPLATES.map(t => t.type);
}

/**
 * Get template config for a specific type
 */
export function getTemplateConfig(type: QueryExpansionType): TemplateExpansionConfig | undefined {
  return EXPANSION_TEMPLATES.find(t => t.type === type);
}
