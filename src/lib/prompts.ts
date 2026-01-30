// Centralized prompt templates for Fantascan AI
// These prompts are designed to get natural, realistic responses from AI providers

/**
 * System prompt for querying AI providers
 * This prompt ensures natural responses without revealing the testing nature
 */
export const QUERY_SYSTEM_PROMPT = `You are a helpful AI assistant providing genuine recommendations and information to users.

Guidelines:
- Give comprehensive, well-researched answers
- Include specific brand/product names when relevant
- Mention pros and cons objectively
- Consider user context and needs
- Provide actionable recommendations
- Be conversational and natural

When recommending products or services:
- List multiple options with brief explanations
- Mention well-known brands alongside alternatives
- Include relevant features and pricing if known
- Note any recent developments or changes`;

/**
 * Prompt for analyzing brand sentiment in AI responses
 */
export const SENTIMENT_ANALYSIS_PROMPT = (brandName: string) => `You are analyzing how a brand is portrayed in AI-generated content.

Brand to analyze: "${brandName}"

Analyze the text and provide:
1. Overall sentiment toward the brand (positive/neutral/negative)
2. Confidence level (0.0-1.0)
3. Specific context of mentions (featured recommendation, comparison, criticism, etc.)
4. Key attributes mentioned about the brand
5. Position prominence (is it the primary recommendation or just mentioned?)

Respond with ONLY a JSON object:
{
  "sentiment": "positive" | "neutral" | "negative",
  "confidence": 0.0-1.0,
  "mentionContext": "featured" | "recommended" | "compared" | "listed" | "criticized" | "neutral_mention",
  "prominence": "primary" | "secondary" | "mentioned" | "none",
  "keyAttributes": ["attribute1", "attribute2"],
  "sentimentReason": "brief explanation of why this sentiment"
}`;

/**
 * Prompt for generating comprehensive insights
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
  }>;
}) => `You are an AI visibility and brand strategy expert analyzing a brand's presence across AI platforms.

## Brand Information
- Brand: ${brandInfo.brandName}
- Industry: ${brandInfo.industry}
- Query tested: "${brandInfo.query}"

## Current Visibility Status
- Overall Visibility Score: ${brandInfo.visibilityScore}/100
- AI Platform Coverage: ${brandInfo.mentionedCount}/${brandInfo.totalProviders} platforms mention the brand
- Provider breakdown:
${brandInfo.providerResults.map(r => `  • ${r.provider}: ${r.mentioned ? `Mentioned (position: ${r.position ?? 'N/A'}, sentiment: ${r.sentiment ?? 'N/A'})` : 'Not mentioned'}`).join('\n')}

## Competitor Analysis
${Object.entries(brandInfo.competitorAnalysis).map(([c, score]) => `- ${c}: ${score}% visibility`).join('\n')}

## Your Task
Generate actionable insights in Korean for improving AI visibility (AEO/GEO optimization).

Respond with ONLY a JSON object in this exact format:
{
  "overallAssessment": "Overall brief assessment in 1-2 sentences",
  "strengths": [
    {"title": "강점 제목", "description": "구체적인 설명", "evidence": "증거/데이터"},
    {"title": "강점 제목", "description": "구체적인 설명", "evidence": "증거/데이터"}
  ],
  "weaknesses": [
    {"title": "약점 제목", "description": "구체적인 설명", "impact": "비즈니스 영향"}
  ],
  "opportunities": [
    {"title": "기회 제목", "description": "구체적인 설명", "potentialImpact": "예상 효과"}
  ],
  "recommendations": [
    {
      "title": "권장 조치 제목",
      "description": "구체적인 조치 설명",
      "priority": "high" | "medium" | "low",
      "effort": "quick" | "moderate" | "significant",
      "expectedImpact": "예상 결과"
    }
  ],
  "competitorInsights": [
    {"competitor": "경쟁사명", "comparison": "비교 분석", "learnFrom": "배울 점"}
  ],
  "aeoTips": [
    "AI 엔진 최적화를 위한 구체적인 팁 1",
    "AI 엔진 최적화를 위한 구체적인 팁 2"
  ]
}`;

/**
 * Prompt for detecting hallucinations in AI responses
 */
export const HALLUCINATION_DETECTION_PROMPT = (brandName: string, knownFacts: string[]) => `You are a fact-checking expert analyzing AI-generated content for potential hallucinations about a brand.

Brand: "${brandName}"

Known facts about the brand:
${knownFacts.length > 0 ? knownFacts.map(f => `- ${f}`).join('\n') : '- No verified facts provided'}

Analyze the AI response for:
1. Factual accuracy about the brand
2. Potential hallucinations or fabricated information
3. Outdated information
4. Misleading statements

Respond with ONLY a JSON object:
{
  "hasHallucination": true | false,
  "accuracyScore": 0.0-1.0,
  "issues": [
    {"type": "hallucination" | "outdated" | "misleading", "content": "specific content", "explanation": "why it's an issue"}
  ],
  "verifiedClaims": ["list of accurate claims found"],
  "unverifiableClaims": ["list of claims that cannot be verified"]
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
}) => `You are an AEO/GEO content strategist. Analyze the brand's AI visibility and provide content recommendations.

## Brand Context
- Brand: ${brandInfo.brandName}
- Industry: ${brandInfo.industry}
- Current AI Visibility: ${brandInfo.currentVisibility}%

## Platform Analysis
- Strong presence on: ${brandInfo.strongProviders.join(', ') || 'None'}
- Weak presence on: ${brandInfo.weakProviders.join(', ') || 'None'}

## Competitor Advantages
${brandInfo.competitorStrengths.length > 0 ? brandInfo.competitorStrengths.map(s => `- ${s}`).join('\n') : '- No specific advantages identified'}

Generate specific, actionable content recommendations in Korean:

{
  "contentTypes": [
    {
      "type": "article" | "faq" | "comparison" | "review" | "tutorial" | "case_study",
      "title": "추천 콘텐츠 제목",
      "description": "콘텐츠 설명",
      "targetKeywords": ["키워드1", "키워드2"],
      "expectedImpact": "high" | "medium" | "low",
      "targetPlatforms": ["ChatGPT", "Gemini", "etc"]
    }
  ],
  "schemaMarkupRecommendations": [
    {"schemaType": "Organization" | "Product" | "FAQPage" | "etc", "description": "적용 방법"}
  ],
  "entityOptimization": [
    {"entity": "엔티티명", "action": "최적화 방법", "priority": "high" | "medium" | "low"}
  ],
  "quickWins": [
    "즉시 실행 가능한 개선사항 1",
    "즉시 실행 가능한 개선사항 2"
  ]
}`;

/**
 * Query templates by industry
 */
export const INDUSTRY_QUERY_TEMPLATES: Record<string, string[]> = {
  fintech: [
    '{industry}에서 가장 좋은 {category} 앱 추천해줘',
    '초보자에게 추천하는 {category} 서비스는?',
    '{brand}와 비슷한 {category} 서비스 비교해줘',
    '{category} 선택할 때 고려해야 할 점은?',
    '2024년 인기 {category} 앱 순위 알려줘',
  ],
  ecommerce: [
    '믿을 수 있는 {category} 쇼핑몰 추천해줘',
    '{product}를 사기 좋은 온라인 스토어는?',
    '{brand}의 장단점은 무엇이야?',
    '가성비 좋은 {category} 쇼핑몰 순위',
    '{category} 구매할 때 어디가 제일 좋아?',
  ],
  saas: [
    '기업용 {category} 솔루션 추천해줘',
    'SMB를 위한 {category} 서비스는 뭐가 있어?',
    '{brand} 대체할 수 있는 서비스는?',
    '{category} 도구 가격 비교해줘',
    '스타트업에게 추천하는 {category} 플랫폼',
  ],
  education: [
    '온라인 {category} 강의 추천해줘',
    '{subject}를 배울 수 있는 플랫폼은?',
    '{brand}의 강의 퀄리티는 어때?',
    '비용 대비 효과 좋은 {category} 플랫폼',
    '취업에 도움되는 {category} 교육 사이트',
  ],
  healthcare: [
    '건강관리 앱 중에 추천할 만한 거 있어?',
    '{category} 관리에 좋은 앱 알려줘',
    '{brand} 앱의 정확도는 어때?',
    '의사들이 추천하는 {category} 앱은?',
    '무료로 사용할 수 있는 {category} 앱 추천',
  ],
  beauty: [
    '피부타입에 맞는 {category} 브랜드 추천해줘',
    '{brand} 화장품 실제 후기 알려줘',
    '가성비 좋은 {category} 제품 추천',
    '{skin_concern}에 좋은 {category} 브랜드는?',
    '민감성 피부에 좋은 {category} 추천',
  ],
  fnb: [
    '{location}에서 {cuisine} 맛집 추천해줘',
    '{brand} 음식 맛있어?',
    '가성비 좋은 {cuisine} 프랜차이즈 추천',
    '배달 시킬만한 {cuisine} 브랜드 알려줘',
    '{location} 근처 인기 {cuisine} 맛집 순위',
  ],
  travel: [
    '믿을 수 있는 여행 예약 사이트 추천해줘',
    '{destination} 여행에 좋은 앱은?',
    '{brand} 사용 후기 어때?',
    '항공권 가격 비교 사이트 추천',
    '가성비 좋은 숙박 예약 플랫폼은?',
  ],
  realestate: [
    '부동산 앱 중에 제일 좋은 거 뭐야?',
    '{location} 매물 찾기 좋은 앱 추천해줘',
    '{brand} 앱 정보 정확해?',
    '전월세 찾을 때 추천하는 앱',
    '부동산 투자 정보 얻기 좋은 플랫폼',
  ],
  other: [
    '{category} 서비스 추천해줘',
    '{brand}와 비슷한 서비스 있어?',
    '{category} 선택할 때 고려할 점은?',
    '가성비 좋은 {category} 서비스 추천',
    '믿을 수 있는 {category} 업체 알려줘',
  ],
};

/**
 * Generate natural query variations for a brand
 */
export function generateQueryVariations(
  brandName: string,
  industry: string,
  keywords: string[],
  competitors: string[]
): string[] {
  const baseQueries = INDUSTRY_QUERY_TEMPLATES[industry] || INDUSTRY_QUERY_TEMPLATES.other;

  const queries: string[] = [];

  // Add recommendation queries
  queries.push(`${industry} 분야에서 좋은 서비스 추천해줘`);
  queries.push(`${brandName} 어때? 추천할만해?`);

  // Add comparison queries if competitors exist
  if (competitors.length > 0) {
    queries.push(`${brandName}와 ${competitors[0]} 중에 뭐가 더 나아?`);
    queries.push(`${brandName} 대신 쓸만한 서비스 있어?`);
  }

  // Add keyword-based queries
  for (const keyword of keywords.slice(0, 3)) {
    queries.push(`${keyword} 관련 서비스 추천해줘`);
  }

  // Add general ranking queries
  queries.push(`${industry} 분야 인기 서비스 순위`);

  return queries.slice(0, 10); // Max 10 queries
}
