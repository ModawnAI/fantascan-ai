// Centralized prompt templates for Fantascan AI
// These prompts are designed to get natural, realistic responses from AI providers
// and provide comprehensive brand visibility analysis

/**
 * System prompt for querying AI providers
 * Designed to elicit natural, recommendation-style responses
 */
export const QUERY_SYSTEM_PROMPT = `You are a knowledgeable assistant helping users find the best products, services, and solutions.

When responding:
- Provide specific, actionable recommendations with brand names
- List options in order of relevance/quality
- Include brief pros and cons for each option
- Be conversational and genuinely helpful
- Share your reasoning for recommendations
- Mention pricing tiers or value propositions when relevant
- Consider the user's likely context and needs

Format your responses clearly with numbered lists or bullet points when comparing options.`;

/**
 * Prompt for analyzing brand sentiment in AI responses
 * Returns structured analysis of how the brand is portrayed
 */
export const SENTIMENT_ANALYSIS_PROMPT = (brandName: string) => `Analyze how "${brandName}" is portrayed in AI-generated content.

Evaluate:
1. Overall sentiment (positive/neutral/negative)
2. Confidence level (0.0-1.0) based on clarity of sentiment signals
3. Context of mention (recommendation, comparison, criticism, etc.)
4. Position prominence (is it the primary focus or just mentioned?)
5. Key attributes associated with the brand
6. Comparison with competitors if mentioned

Return ONLY valid JSON:
{
  "sentiment": "positive" | "neutral" | "negative",
  "confidence": 0.0-1.0,
  "mentionContext": "featured" | "recommended" | "compared" | "listed" | "criticized" | "neutral_mention",
  "prominence": "primary" | "secondary" | "mentioned" | "none",
  "keyAttributes": ["attribute1", "attribute2"],
  "sentimentReason": "Brief explanation of sentiment assessment",
  "competitorComparison": "Brief note on how brand compares to competitors if mentioned"
}`;

/**
 * Prompt for generating comprehensive insights
 * Provides actionable AEO/GEO optimization recommendations
 */
export const INSIGHTS_GENERATION_PROMPT = (brandInfo: {
  brandName: string;
  industry: string;
  query: string;
  visibilityScore: number;
  mentionedCount: number;
  totalProviders: number;
  competitorAnalysis: Record<string, number>;
  providerResults: Array<{
    provider: string;
    mentioned: boolean;
    sentiment: string | null;
    position: number | null;
    prominence?: string;
  }>;
}) => `You are an AI visibility and AEO (Answer Engine Optimization) expert.

## Analysis Context
- Brand: ${brandInfo.brandName}
- Industry: ${brandInfo.industry}
- Query Tested: "${brandInfo.query}"

## Current Performance
- Visibility Score: ${brandInfo.visibilityScore}/100
- Platform Coverage: ${brandInfo.mentionedCount}/${brandInfo.totalProviders} AI platforms
- Provider Results:
${brandInfo.providerResults.map(r => `  • ${r.provider}: ${r.mentioned ? `✅ Mentioned (position: ${r.position ?? 'N/A'}, sentiment: ${r.sentiment ?? 'N/A'}, prominence: ${r.prominence ?? 'N/A'})` : '❌ Not mentioned'}`).join('\n')}

## Competitor Comparison
${Object.entries(brandInfo.competitorAnalysis).length > 0 ? Object.entries(brandInfo.competitorAnalysis).map(([c, score]) => `- ${c}: ${score}% visibility`).join('\n') : '- No competitor data available'}

## Task
Generate actionable insights in Korean. Be specific and data-driven.

Return ONLY valid JSON:
{
  "overallAssessment": "1-2 sentence summary of brand's AI visibility status",
  "strengths": [
    {
      "title": "강점 제목",
      "description": "구체적인 설명",
      "evidence": "데이터 기반 증거"
    }
  ],
  "weaknesses": [
    {
      "title": "약점 제목",
      "description": "구체적인 설명",
      "impact": "비즈니스에 미치는 영향"
    }
  ],
  "opportunities": [
    {
      "title": "기회 제목",
      "description": "구체적인 설명",
      "potentialImpact": "예상 효과"
    }
  ],
  "recommendations": [
    {
      "title": "권장 조치",
      "description": "구체적인 실행 방안",
      "priority": "high" | "medium" | "low",
      "effort": "quick" | "moderate" | "significant",
      "expectedImpact": "예상 결과"
    }
  ],
  "competitorInsights": [
    {
      "competitor": "경쟁사명",
      "comparison": "비교 분석 내용",
      "learnFrom": "배울 점"
    }
  ],
  "aeoTips": [
    "AI 엔진 최적화를 위한 구체적인 팁"
  ]
}`;

/**
 * Prompt for detecting hallucinations in AI responses
 */
export const HALLUCINATION_DETECTION_PROMPT = (brandName: string, knownFacts: string[]) => `Fact-check AI-generated content about "${brandName}".

Known verified facts:
${knownFacts.length > 0 ? knownFacts.map(f => `- ${f}`).join('\n') : '- No verified facts provided'}

Check for:
1. Factual accuracy of brand claims
2. Fabricated features, pricing, or capabilities
3. Outdated information
4. Misleading comparisons

Return ONLY valid JSON:
{
  "hasHallucination": true | false,
  "accuracyScore": 0.0-1.0,
  "issues": [
    {
      "type": "hallucination" | "outdated" | "misleading",
      "content": "Specific problematic content",
      "explanation": "Why this is inaccurate"
    }
  ],
  "verifiedClaims": ["List of accurate claims"],
  "unverifiableClaims": ["Claims that cannot be verified"]
}`;

/**
 * Prompt for generating content recommendations
 */
export const CONTENT_RECOMMENDATIONS_PROMPT = (brandInfo: {
  brandName: string;
  industry: string;
  currentVisibility: number;
  weakProviders: string[];
  strongProviders: string[];
  competitorStrengths: string[];
}) => `Generate AEO content strategy for "${brandInfo.brandName}".

## Current Status
- Industry: ${brandInfo.industry}
- AI Visibility: ${brandInfo.currentVisibility}%
- Strong on: ${brandInfo.strongProviders.join(', ') || 'None'}
- Weak on: ${brandInfo.weakProviders.join(', ') || 'None'}

## Competitor Advantages
${brandInfo.competitorStrengths.length > 0 ? brandInfo.competitorStrengths.map(s => `- ${s}`).join('\n') : '- No specific advantages identified'}

Return ONLY valid JSON in Korean:
{
  "contentTypes": [
    {
      "type": "article" | "faq" | "comparison" | "review" | "tutorial" | "case_study",
      "title": "추천 콘텐츠 제목",
      "description": "콘텐츠 설명",
      "targetKeywords": ["키워드1", "키워드2"],
      "expectedImpact": "high" | "medium" | "low",
      "targetPlatforms": ["ChatGPT", "Gemini", etc]
    }
  ],
  "schemaMarkupRecommendations": [
    {
      "schemaType": "Organization" | "Product" | "FAQPage" | etc,
      "description": "적용 방법"
    }
  ],
  "entityOptimization": [
    {
      "entity": "엔티티명",
      "action": "최적화 방법",
      "priority": "high" | "medium" | "low"
    }
  ],
  "quickWins": [
    "즉시 실행 가능한 개선사항"
  ]
}`;

/**
 * Prompt for generating scan summary
 */
export const SCAN_SUMMARY_PROMPT = (data: {
  brandName: string;
  query: string;
  visibilityScore: number;
  mentionedProviders: string[];
  notMentionedProviders: string[];
  positiveProviders: string[];
  negativeProviders: string[];
  topCompetitors: Array<{ name: string; score: number }>;
}) => `Generate a brief scan summary for "${data.brandName}".

Query: "${data.query}"
Score: ${data.visibilityScore}/100

Mentioned by: ${data.mentionedProviders.join(', ') || 'None'}
Not mentioned: ${data.notMentionedProviders.join(', ') || 'None'}
Positive sentiment: ${data.positiveProviders.join(', ') || 'None'}
Negative sentiment: ${data.negativeProviders.join(', ') || 'None'}

Top competitors:
${data.topCompetitors.map(c => `- ${c.name}: ${c.score}%`).join('\n') || 'No competitor data'}

Write a 2-3 sentence summary in Korean that:
1. States the overall visibility level
2. Highlights key findings (good or bad)
3. Suggests one immediate action

Return ONLY the summary text, no JSON.`;

/**
 * Industry-specific query templates for comprehensive testing
 */
export const INDUSTRY_QUERY_TEMPLATES: Record<string, string[]> = {
  fintech: [
    '{industry}에서 가장 좋은 {category} 앱 추천해줘',
    '초보자에게 추천하는 {category} 서비스는?',
    '{brand}와 비슷한 {category} 서비스 비교해줘',
    '{category} 선택할 때 고려해야 할 점은?',
    '2024년 인기 {category} 앱 순위 알려줘',
    '{category} 수수료 비교해줘',
    '안전한 {category} 플랫폼 추천',
  ],
  ecommerce: [
    '믿을 수 있는 {category} 쇼핑몰 추천해줘',
    '{product}를 사기 좋은 온라인 스토어는?',
    '{brand}의 장단점은 무엇이야?',
    '가성비 좋은 {category} 쇼핑몰 순위',
    '{category} 구매할 때 어디가 제일 좋아?',
    '배송 빠른 {category} 쇼핑몰은?',
    '{category} 정품 보장되는 곳 추천',
  ],
  saas: [
    '기업용 {category} 솔루션 추천해줘',
    'SMB를 위한 {category} 서비스는 뭐가 있어?',
    '{brand} 대체할 수 있는 서비스는?',
    '{category} 도구 가격 비교해줘',
    '스타트업에게 추천하는 {category} 플랫폼',
    '{category} 무료 플랜 있는 서비스는?',
    '{category} 올인원 솔루션 추천',
  ],
  education: [
    '온라인 {category} 강의 추천해줘',
    '{subject}를 배울 수 있는 플랫폼은?',
    '{brand}의 강의 퀄리티는 어때?',
    '비용 대비 효과 좋은 {category} 플랫폼',
    '취업에 도움되는 {category} 교육 사이트',
    '무료로 배울 수 있는 {category} 사이트',
    '{category} 자격증 준비하기 좋은 플랫폼',
  ],
  healthcare: [
    '건강관리 앱 중에 추천할 만한 거 있어?',
    '{category} 관리에 좋은 앱 알려줘',
    '{brand} 앱의 정확도는 어때?',
    '의사들이 추천하는 {category} 앱은?',
    '무료로 사용할 수 있는 {category} 앱 추천',
    '{category} 기록 관리하기 좋은 앱',
    '가족 건강 관리 앱 추천해줘',
  ],
  beauty: [
    '피부타입에 맞는 {category} 브랜드 추천해줘',
    '{brand} 화장품 실제 후기 알려줘',
    '가성비 좋은 {category} 제품 추천',
    '{skin_concern}에 좋은 {category} 브랜드는?',
    '민감성 피부에 좋은 {category} 추천',
    '{category} 성분 좋은 브랜드는?',
    '럭셔리 {category} 브랜드 순위',
  ],
  fnb: [
    '{location}에서 {cuisine} 맛집 추천해줘',
    '{brand} 음식 맛있어?',
    '가성비 좋은 {cuisine} 프랜차이즈 추천',
    '배달 시킬만한 {cuisine} 브랜드 알려줘',
    '{location} 근처 인기 {cuisine} 맛집 순위',
    '건강한 {cuisine} 프랜차이즈 있어?',
    '{cuisine} 신메뉴 맛있는 곳',
  ],
  travel: [
    '믿을 수 있는 여행 예약 사이트 추천해줘',
    '{destination} 여행에 좋은 앱은?',
    '{brand} 사용 후기 어때?',
    '항공권 가격 비교 사이트 추천',
    '가성비 좋은 숙박 예약 플랫폼은?',
    '해외여행 보험 비교해줘',
    '{destination} 액티비티 예약 플랫폼',
  ],
  realestate: [
    '부동산 앱 중에 제일 좋은 거 뭐야?',
    '{location} 매물 찾기 좋은 앱 추천해줘',
    '{brand} 앱 정보 정확해?',
    '전월세 찾을 때 추천하는 앱',
    '부동산 투자 정보 얻기 좋은 플랫폼',
    '신축 아파트 정보 앱 추천',
    '오피스텔 매물 많은 앱은?',
  ],
  other: [
    '{category} 서비스 추천해줘',
    '{brand}와 비슷한 서비스 있어?',
    '{category} 선택할 때 고려할 점은?',
    '가성비 좋은 {category} 서비스 추천',
    '믿을 수 있는 {category} 업체 알려줘',
    '{category} 후기 좋은 곳 추천',
    '{category} 1위 브랜드는?',
  ],
};

/**
 * Provider-specific system prompts for better responses
 */
export const PROVIDER_SYSTEM_PROMPTS: Record<string, string> = {
  openai: `You are a helpful assistant providing product and service recommendations.
Be specific, name brands, and explain your reasoning.
Format responses with clear structure using lists when comparing options.`,

  anthropic: `You are a knowledgeable assistant helping users find the best solutions.
Provide balanced, well-researched recommendations with specific brand names.
Consider pros and cons objectively.`,

  gemini: `You are a helpful AI assistant providing genuine recommendations.
Include specific brand names and explain why you recommend them.
Be conversational and thorough.`,

  perplexity: `Provide comprehensive recommendations with current information.
Include specific brand names, recent reviews, and relevant data.
Cite sources when possible.`,

  grok: `Give straight-up, honest recommendations with specific names.
Be direct about what's good and what's not.
Share real opinions based on available data.`,
};

/**
 * Generate natural query variations for testing brand visibility
 */
export function generateQueryVariations(
  brandName: string,
  industry: string,
  keywords: string[],
  competitors: string[]
): string[] {
  const templates = INDUSTRY_QUERY_TEMPLATES[industry] || INDUSTRY_QUERY_TEMPLATES.other;
  const queries: string[] = [];

  // Direct brand queries
  queries.push(`${brandName} 어때? 추천할만해?`);
  queries.push(`${brandName} 써본 사람 후기 알려줘`);

  // Category recommendation queries
  queries.push(`${industry} 분야에서 좋은 서비스 추천해줘`);
  queries.push(`${industry} 서비스 순위 알려줘`);

  // Competitor comparison queries
  if (competitors.length > 0) {
    queries.push(`${brandName}와 ${competitors[0]} 중에 뭐가 더 나아?`);
    queries.push(`${brandName} 대신 쓸만한 서비스 있어?`);
    if (competitors.length > 1) {
      queries.push(`${competitors.slice(0, 3).join(', ')} 비교해줘`);
    }
  }

  // Keyword-based queries
  for (const keyword of keywords.slice(0, 2)) {
    queries.push(`${keyword} 관련 서비스 추천해줘`);
  }

  // Use-case specific queries
  queries.push(`${industry} 초보자에게 추천하는 서비스`);
  queries.push(`가성비 좋은 ${industry} 서비스`);

  return queries.slice(0, 10);
}

/**
 * Analyze query intent for better result interpretation
 */
export function analyzeQueryIntent(query: string): {
  type: 'recommendation' | 'comparison' | 'review' | 'ranking' | 'specific';
  expectsBrandMention: boolean;
  competitiveContext: boolean;
} {
  const lowerQuery = query.toLowerCase();

  // Check for comparison queries
  if (lowerQuery.includes('비교') || lowerQuery.includes('vs') || lowerQuery.includes('차이')) {
    return { type: 'comparison', expectsBrandMention: true, competitiveContext: true };
  }

  // Check for ranking queries
  if (lowerQuery.includes('순위') || lowerQuery.includes('1위') || lowerQuery.includes('베스트') || lowerQuery.includes('탑')) {
    return { type: 'ranking', expectsBrandMention: true, competitiveContext: true };
  }

  // Check for review queries
  if (lowerQuery.includes('후기') || lowerQuery.includes('리뷰') || lowerQuery.includes('어때')) {
    return { type: 'review', expectsBrandMention: true, competitiveContext: false };
  }

  // Check for specific brand queries
  const specificPatterns = ['써본', '사용해본', '경험', '평가'];
  if (specificPatterns.some(p => lowerQuery.includes(p))) {
    return { type: 'specific', expectsBrandMention: true, competitiveContext: false };
  }

  // Default to recommendation
  return { type: 'recommendation', expectsBrandMention: true, competitiveContext: true };
}

/**
 * Format provider response for display
 */
export function formatProviderResponse(response: string, maxLength: number = 500): string {
  if (!response) return '';

  // Clean up common formatting issues
  let cleaned = response
    .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
    .replace(/^\s+/gm, '') // Remove leading whitespace
    .trim();

  // Truncate if needed
  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength) + '...';
  }

  return cleaned;
}

/**
 * Calculate confidence score for brand detection
 */
export function calculateDetectionConfidence(
  brandMentioned: boolean,
  mentionPosition: number | null,
  sentiment: string | null,
  prominence: string | null
): number {
  if (!brandMentioned) return 0;

  let confidence = 0.5; // Base confidence for mention

  // Position bonus
  if (mentionPosition) {
    if (mentionPosition === 1) confidence += 0.2;
    else if (mentionPosition <= 3) confidence += 0.15;
    else if (mentionPosition <= 5) confidence += 0.1;
    else confidence += 0.05;
  }

  // Prominence bonus
  if (prominence === 'primary') confidence += 0.15;
  else if (prominence === 'secondary') confidence += 0.1;
  else if (prominence === 'mentioned') confidence += 0.05;

  // Sentiment clarity bonus
  if (sentiment === 'positive' || sentiment === 'negative') {
    confidence += 0.1;
  }

  return Math.min(1, confidence);
}
