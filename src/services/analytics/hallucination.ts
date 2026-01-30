/**
 * Hallucination Detection Service
 * Detects AI hallucinations (inaccurate information) about brands
 */

import { createLLMClient } from '@/services/llm';
import { logger } from '@/lib/logger';

interface HallucinationCheckInput {
  brandName: string;
  brandDescription: string;
  brandFacts: BrandFact[];
  aiResponse: string;
  provider: string;
}

interface BrandFact {
  category: 'founding' | 'location' | 'product' | 'leadership' | 'metric' | 'other';
  fact: string;
  value: string;
}

interface HallucinationResult {
  hasHallucination: boolean;
  accuracyScore: number; // 0-100
  inaccuracies: Inaccuracy[];
  verifiedFacts: string[];
}

interface Inaccuracy {
  claimedFact: string;
  actualFact: string | null;
  severity: 'minor' | 'moderate' | 'severe';
  context: string;
}

/**
 * Check AI response for hallucinations about the brand
 */
export async function checkHallucination(
  input: HallucinationCheckInput
): Promise<HallucinationResult> {
  const { brandName, brandDescription, brandFacts, aiResponse, provider } = input;
  
  // If no brand facts provided, skip detailed check
  if (brandFacts.length === 0) {
    return {
      hasHallucination: false,
      accuracyScore: 100,
      inaccuracies: [],
      verifiedFacts: [],
    };
  }
  
  try {
    // Use AI to check for hallucinations
    const result = await performAIHallucinationCheck(
      brandName,
      brandDescription,
      brandFacts,
      aiResponse
    );
    
    return result;
  } catch (error) {
    logger.error('Hallucination check failed', error, { brandName, provider });
    
    // Fallback to basic keyword matching
    return performBasicHallucinationCheck(brandName, brandFacts, aiResponse);
  }
}

/**
 * Use AI to perform detailed hallucination check
 */
async function performAIHallucinationCheck(
  brandName: string,
  brandDescription: string,
  brandFacts: BrandFact[],
  aiResponse: string
): Promise<HallucinationResult> {
  const factsText = brandFacts.map(f => `- ${f.category}: ${f.fact} = ${f.value}`).join('\n');
  
  const prompt = `당신은 사실 검증 전문가입니다. AI가 생성한 브랜드 정보의 정확성을 검증하세요.

브랜드명: ${brandName}
브랜드 설명: ${brandDescription || '없음'}

알려진 사실:
${factsText}

AI 응답:
"""
${aiResponse.slice(0, 2000)}
"""

위 AI 응답에서 브랜드 "${brandName}"에 대해 언급된 내용 중 알려진 사실과 다르거나 부정확한 정보를 찾아주세요.

다음 JSON 형식으로 응답하세요:
{
  "hasHallucination": boolean,
  "accuracyScore": number (0-100),
  "inaccuracies": [
    {
      "claimedFact": "AI가 주장한 내용",
      "actualFact": "실제 사실 (알 수 없으면 null)",
      "severity": "minor" | "moderate" | "severe",
      "context": "해당 내용이 나온 문맥"
    }
  ],
  "verifiedFacts": ["확인된 정확한 사실들"]
}

JSON만 응답하세요.`;

  const client = createLLMClient('openai');
  const response = await client.complete(
    [{ role: 'user', content: prompt }],
    { temperature: 0, maxTokens: 1000, timeout: 15000 }
  );
  
  try {
    const result = JSON.parse(response.content);
    return {
      hasHallucination: result.hasHallucination || false,
      accuracyScore: result.accuracyScore || 100,
      inaccuracies: result.inaccuracies || [],
      verifiedFacts: result.verifiedFacts || [],
    };
  } catch {
    logger.warn('Failed to parse hallucination check response');
    return {
      hasHallucination: false,
      accuracyScore: 100,
      inaccuracies: [],
      verifiedFacts: [],
    };
  }
}

/**
 * Basic hallucination check using keyword matching
 */
function performBasicHallucinationCheck(
  brandName: string,
  brandFacts: BrandFact[],
  aiResponse: string
): HallucinationResult {
  const inaccuracies: Inaccuracy[] = [];
  const verifiedFacts: string[] = [];
  const lowerResponse = aiResponse.toLowerCase();
  
  // Check each fact
  brandFacts.forEach(fact => {
    const lowerValue = fact.value.toLowerCase();
    
    // Check if the fact value is mentioned
    if (lowerResponse.includes(lowerValue)) {
      verifiedFacts.push(`${fact.fact}: ${fact.value}`);
    }
    
    // Basic contradiction detection (e.g., different years)
    if (fact.category === 'founding') {
      // Check for year mentions that don't match
      const yearMatch = aiResponse.match(/(\d{4})년에?\s*(설립|창립|시작)/);
      if (yearMatch && !fact.value.includes(yearMatch[1])) {
        inaccuracies.push({
          claimedFact: `${yearMatch[1]}년 설립`,
          actualFact: fact.value,
          severity: 'moderate',
          context: yearMatch[0],
        });
      }
    }
  });
  
  const hasHallucination = inaccuracies.length > 0;
  const totalChecks = brandFacts.length;
  const accuracyScore = totalChecks > 0
    ? Math.round(((totalChecks - inaccuracies.length) / totalChecks) * 100)
    : 100;
  
  return {
    hasHallucination,
    accuracyScore,
    inaccuracies,
    verifiedFacts,
  };
}

/**
 * Extract potential facts from brand description
 */
export function extractBrandFacts(brandDescription: string): BrandFact[] {
  const facts: BrandFact[] = [];
  
  if (!brandDescription) return facts;
  
  // Extract year mentions
  const yearMatches = brandDescription.match(/(\d{4})년/g);
  if (yearMatches) {
    yearMatches.forEach(match => {
      facts.push({
        category: 'founding',
        fact: '설립연도',
        value: match,
      });
    });
  }
  
  // Extract location mentions (Korean cities)
  const cityPattern = /(서울|부산|인천|대구|대전|광주|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)/g;
  const cityMatches = brandDescription.match(cityPattern);
  if (cityMatches) {
    cityMatches.forEach(match => {
      facts.push({
        category: 'location',
        fact: '위치',
        value: match,
      });
    });
  }
  
  // Extract number mentions (employees, revenue, etc.)
  const numberPattern = /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(명|원|개|억|만)/g;
  let match;
  while ((match = numberPattern.exec(brandDescription)) !== null) {
    facts.push({
      category: 'metric',
      fact: '수치',
      value: match[0],
    });
  }
  
  return facts;
}

/**
 * Generate hallucination report
 */
export function generateHallucinationReport(
  results: Array<{
    provider: string;
    result: HallucinationResult;
  }>
): {
  overallAccuracy: number;
  providersWithIssues: string[];
  totalInaccuracies: number;
  severeInaccuracies: number;
  summary: string;
} {
  const providersWithIssues = results
    .filter(r => r.result.hasHallucination)
    .map(r => r.provider);
  
  const allInaccuracies = results.flatMap(r => r.result.inaccuracies);
  const severeInaccuracies = allInaccuracies.filter(i => i.severity === 'severe');
  
  const accuracyScores = results.map(r => r.result.accuracyScore);
  const overallAccuracy = accuracyScores.length > 0
    ? Math.round(accuracyScores.reduce((a, b) => a + b, 0) / accuracyScores.length)
    : 100;
  
  let summary: string;
  if (allInaccuracies.length === 0) {
    summary = '모든 AI 엔진에서 브랜드 정보가 정확하게 제공되고 있습니다.';
  } else if (severeInaccuracies.length > 0) {
    summary = `${severeInaccuracies.length}개의 심각한 부정확한 정보가 발견되었습니다. 즉각적인 조치가 필요합니다.`;
  } else {
    summary = `${allInaccuracies.length}개의 부정확한 정보가 발견되었습니다. 모니터링이 필요합니다.`;
  }
  
  return {
    overallAccuracy,
    providersWithIssues,
    totalInaccuracies: allInaccuracies.length,
    severeInaccuracies: severeInaccuracies.length,
    summary,
  };
}
