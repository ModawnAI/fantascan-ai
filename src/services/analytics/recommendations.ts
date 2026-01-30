/**
 * Content Recommendations Service
 * Generates AI-powered recommendations for improving brand visibility
 */

import { createLLMClient } from '@/services/llm';
import { logger } from '@/lib/logger';
import type { BrandDetectionResult } from '@/services/brand-detection';
import type { 
  ContentRecommendation, 
  RecommendationType, 
  RecommendationPriority,
} from '@/types/database';

interface RecommendationInput {
  brandName: string;
  brandDescription: string;
  keywords: string[];
  competitors: string[];
  results: BrandDetectionResult[];
  scanId: string;
  brandId: string;
}

interface GeneratedRecommendation {
  recommendation_type: RecommendationType;
  priority: RecommendationPriority;
  title: string;
  description: string;
  action_items: string[];
  estimated_impact: 'high' | 'medium' | 'low';
  estimated_effort: 'quick' | 'moderate' | 'significant';
  target_provider: string | null;
}

/**
 * Generate content optimization recommendations
 */
export async function generateRecommendations(
  input: RecommendationInput
): Promise<Omit<ContentRecommendation, 'id' | 'created_at' | 'status' | 'completed_at'>[]> {
  const { brandName, scanId, brandId } = input;
  
  const recommendations: Omit<ContentRecommendation, 'id' | 'created_at' | 'status' | 'completed_at'>[] = [];
  
  // Analyze results to generate rule-based recommendations
  const ruleBasedRecs = generateRuleBasedRecommendations(input);
  recommendations.push(...ruleBasedRecs.map(rec => ({
    ...rec,
    scan_id: scanId,
    brand_id: brandId,
  })));
  
  // Generate AI-powered recommendations for deeper insights
  try {
    const aiRecs = await generateAIRecommendations(input);
    recommendations.push(...aiRecs.map(rec => ({
      ...rec,
      scan_id: scanId,
      brand_id: brandId,
    })));
  } catch (error) {
    logger.error('AI recommendation generation failed', error, { brandName });
  }
  
  // Deduplicate and prioritize
  const uniqueRecs = deduplicateRecommendations(recommendations);
  
  return uniqueRecs.slice(0, 10); // Return top 10 recommendations
}

/**
 * Generate rule-based recommendations based on scan results
 */
function generateRuleBasedRecommendations(
  input: RecommendationInput
): GeneratedRecommendation[] {
  const { brandName, results } = input;
  const recommendations: GeneratedRecommendation[] = [];
  
  const validResults = results.filter(r => !r.error);
  const mentionedCount = validResults.filter(r => r.brandMentioned).length;
  const totalProviders = validResults.length;
  const visibilityRate = totalProviders > 0 ? mentionedCount / totalProviders : 0;
  
  // Low visibility recommendation
  if (visibilityRate < 0.5) {
    recommendations.push({
      recommendation_type: 'content',
      priority: 'critical',
      title: 'AI 가시성 긴급 개선 필요',
      description: `${brandName}가 AI 검색 결과의 ${Math.round(visibilityRate * 100)}%에만 노출되고 있습니다. 대부분의 AI 엔진에서 브랜드가 인식되지 않고 있어 즉각적인 조치가 필요합니다.`,
      action_items: [
        '브랜드 관련 고품질 콘텐츠를 주요 플랫폼에 게시하세요',
        '위키피디아, 나무위키 등 신뢰할 수 있는 출처에 브랜드 정보를 등록하세요',
        '업계 미디어 및 블로그에 브랜드 관련 기사를 배포하세요',
      ],
      estimated_impact: 'high',
      estimated_effort: 'significant',
      target_provider: null,
    });
  }
  
  // Provider-specific recommendations
  validResults.forEach(result => {
    if (!result.brandMentioned) {
      recommendations.push({
        recommendation_type: 'content',
        priority: 'high',
        title: `${getProviderName(result.provider)}에서 브랜드 미노출`,
        description: `${getProviderName(result.provider)}에서 ${brandName}가 언급되지 않았습니다. 해당 AI 엔진이 학습하는 데이터 소스를 분석하고 타겟팅된 콘텐츠 전략이 필요합니다.`,
        action_items: [
          `${getProviderName(result.provider)}가 크롤링하는 주요 사이트에 콘텐츠 게시`,
          '브랜드 키워드와 관련 엔티티를 명확히 연결하는 콘텐츠 작성',
        ],
        estimated_impact: 'medium',
        estimated_effort: 'moderate',
        target_provider: result.provider,
      });
    }
  });
  
  // Sentiment-based recommendations
  const negativeResults = validResults.filter(
    r => r.brandMentioned && r.sentiment === 'negative'
  );
  if (negativeResults.length > 0) {
    recommendations.push({
      recommendation_type: 'content',
      priority: 'critical',
      title: '부정적 브랜드 인식 개선 필요',
      description: `${negativeResults.length}개의 AI 엔진에서 ${brandName}에 대해 부정적인 정보가 제공되고 있습니다. 브랜드 이미지 관리가 시급합니다.`,
      action_items: [
        '부정적 내용의 원인을 파악하고 대응 콘텐츠 작성',
        '긍정적인 브랜드 스토리와 성공 사례 적극 홍보',
        '고객 리뷰 및 평가 관리 강화',
      ],
      estimated_impact: 'high',
      estimated_effort: 'significant',
      target_provider: null,
    });
  }
  
  // Competitor-related recommendations
  const competitorMentions = new Map<string, number>();
  validResults.forEach(r => {
    r.competitorsMentioned.forEach((c: string) => {
      competitorMentions.set(c, (competitorMentions.get(c) || 0) + 1);
    });
  });
  
  const topCompetitor = [...competitorMentions.entries()]
    .sort((a, b) => b[1] - a[1])[0];
  
  if (topCompetitor && topCompetitor[1] > mentionedCount) {
    recommendations.push({
      recommendation_type: 'content',
      priority: 'high',
      title: `경쟁사 ${topCompetitor[0]} 대비 가시성 열세`,
      description: `${topCompetitor[0]}가 ${topCompetitor[1]}개의 AI 엔진에서 언급되는 반면, ${brandName}는 ${mentionedCount}개에서만 언급됩니다. 경쟁력 강화가 필요합니다.`,
      action_items: [
        `${topCompetitor[0]}가 노출되는 키워드와 컨텍스트 분석`,
        '차별화된 브랜드 가치 제안 콘텐츠 개발',
        '비교 콘텐츠에서 우위 확보를 위한 전략 수립',
      ],
      estimated_impact: 'high',
      estimated_effort: 'moderate',
      target_provider: null,
    });
  }
  
  // Schema markup recommendation
  recommendations.push({
    recommendation_type: 'schema',
    priority: 'medium',
    title: '구조화된 데이터 마크업 최적화',
    description: 'AI 엔진은 구조화된 데이터를 더 잘 이해합니다. Schema.org 마크업을 통해 브랜드 정보를 명확하게 전달하세요.',
    action_items: [
      'Organization 스키마로 브랜드 정보 마크업',
      'Product/Service 스키마로 제품/서비스 정보 구조화',
      'FAQ 스키마로 자주 묻는 질문 최적화',
      'Review/Rating 스키마로 평가 정보 구조화',
    ],
    estimated_impact: 'medium',
    estimated_effort: 'quick',
    target_provider: null,
  });
  
  // Entity optimization recommendation
  recommendations.push({
    recommendation_type: 'entity',
    priority: 'medium',
    title: '엔티티 연결 강화',
    description: 'AI 엔진은 엔티티 관계를 기반으로 정보를 이해합니다. 브랜드와 관련 엔티티(제품, 서비스, 인물, 위치 등) 간의 연결을 강화하세요.',
    action_items: [
      '브랜드 관련 모든 엔티티 목록 작성',
      '각 엔티티 간의 관계를 명확히 하는 콘텐츠 작성',
      'Knowledge Graph에 브랜드 등록 검토',
    ],
    estimated_impact: 'medium',
    estimated_effort: 'moderate',
    target_provider: null,
  });
  
  return recommendations;
}

/**
 * Generate AI-powered recommendations
 */
async function generateAIRecommendations(
  input: RecommendationInput
): Promise<GeneratedRecommendation[]> {
  const { brandName, brandDescription, keywords, competitors, results } = input;
  
  const validResults = results.filter(r => !r.error);
  const mentionedProviders = validResults.filter(r => r.brandMentioned).map(r => r.provider);
  const notMentionedProviders = validResults.filter(r => !r.brandMentioned).map(r => r.provider);
  
  const prompt = `당신은 AI 검색 최적화 전문가입니다. 다음 브랜드의 AI 가시성을 분석하고 구체적인 개선 권장사항을 제공하세요.

브랜드: ${brandName}
설명: ${brandDescription || '없음'}
키워드: ${keywords.join(', ') || '없음'}
경쟁사: ${competitors.join(', ') || '없음'}

AI 가시성 현황:
- 노출된 AI 엔진: ${mentionedProviders.length > 0 ? mentionedProviders.join(', ') : '없음'}
- 미노출 AI 엔진: ${notMentionedProviders.length > 0 ? notMentionedProviders.join(', ') : '없음'}

다음 JSON 형식으로 3개의 구체적인 권장사항을 제공하세요:
[
  {
    "recommendation_type": "content" | "schema" | "keyword" | "entity" | "structure" | "citation",
    "priority": "critical" | "high" | "medium" | "low",
    "title": "제목 (30자 이내)",
    "description": "상세 설명 (100자 이내)",
    "action_items": ["실행 항목 1", "실행 항목 2", "실행 항목 3"],
    "estimated_impact": "high" | "medium" | "low",
    "estimated_effort": "quick" | "moderate" | "significant"
  }
]

JSON 배열만 응답하세요.`;

  try {
    const client = createLLMClient('openai');
    const response = await client.complete(
      [{ role: 'user', content: prompt }],
      { temperature: 0.7, maxTokens: 1500, timeout: 20000 }
    );
    
    const parsed = JSON.parse(response.content);
    return parsed.map((rec: GeneratedRecommendation) => ({
      ...rec,
      target_provider: null,
    }));
  } catch (error) {
    logger.error('Failed to parse AI recommendations', error);
    return [];
  }
}

/**
 * Deduplicate recommendations based on similarity
 */
function deduplicateRecommendations(
  recommendations: Omit<ContentRecommendation, 'id' | 'created_at' | 'status' | 'completed_at'>[]
): Omit<ContentRecommendation, 'id' | 'created_at' | 'status' | 'completed_at'>[] {
  const seen = new Set<string>();
  const unique: Omit<ContentRecommendation, 'id' | 'created_at' | 'status' | 'completed_at'>[] = [];
  
  // Sort by priority first
  const priorityOrder: Record<RecommendationPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  
  const sorted = [...recommendations].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );
  
  sorted.forEach(rec => {
    // Simple deduplication key based on type and provider
    const key = `${rec.recommendation_type}-${rec.target_provider || 'general'}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(rec);
    }
  });
  
  return unique;
}

/**
 * Get display name for provider
 */
function getProviderName(provider: string): string {
  const names: Record<string, string> = {
    gemini: 'Google Gemini',
    openai: 'ChatGPT',
    anthropic: 'Claude',
    grok: 'Grok',
    perplexity: 'Perplexity',
    google_search: 'Google 검색',
  };
  return names[provider] || provider;
}
