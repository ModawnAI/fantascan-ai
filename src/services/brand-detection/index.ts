import { createLLMClient } from '@/services/llm';
import type { ProviderType } from '@/types/database';
import { toInternalProvider } from '@/types/database';
import { config } from '@/lib/config';
import { logger } from '@/lib/logger';
import { ProviderError, ProviderTimeoutError } from '@/lib/errors';
import {
  startSpan,
  trackLLMPerformance,
} from '@/lib/performance';
import {
  SENTIMENT_ANALYSIS_PROMPT,
  INSIGHTS_GENERATION_PROMPT,
} from '@/lib/prompts';

export interface BrandDetectionResult {
  provider: ProviderType;
  responseText: string;
  brandMentioned: boolean;
  mentionPosition: number | null;
  mentionParagraph: number | null;
  mentionContext: 'featured' | 'recommended' | 'compared' | 'listed' | 'criticized' | 'neutral_mention' | null;
  prominence: 'primary' | 'secondary' | 'mentioned' | 'none';
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  sentimentReason: string | null;
  keyAttributes: string[];
  confidence: number;
  competitorsMentioned: string[];
  competitorDetails: Record<string, {
    position: number | null;
    sentiment: string | null;
  }>;
  error?: string;
  durationMs?: number;
}

export interface BrandAnalysisInput {
  brandName: string;
  brandDescription: string;
  keywords: string[];
  competitors: string[];
  query: string;
}

export interface ProviderQueryResult {
  responseText: string;
  error?: string;
  durationMs: number;
}

export interface EnhancedInsights {
  overallAssessment: string;
  overallVisibilityScore: number;
  strengths: Array<{
    title: string;
    description: string;
    evidence: string;
  }>;
  weaknesses: Array<{
    title: string;
    description: string;
    impact: string;
  }>;
  opportunities: Array<{
    title: string;
    description: string;
    potentialImpact: string;
  }>;
  recommendations: Array<{
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    effort: 'quick' | 'moderate' | 'significant';
    expectedImpact: string;
  }>;
  competitorInsights: Array<{
    competitor: string;
    comparison: string;
    learnFrom: string;
  }>;
  aeoTips: string[];
  competitorAnalysis: Record<string, number>;
}

/**
 * Query multiple AI providers in parallel
 */
export async function queryProvidersParallel(
  providers: ProviderType[],
  query: string
): Promise<Map<ProviderType, ProviderQueryResult>> {
  const startTime = Date.now();
  const results = new Map<ProviderType, ProviderQueryResult>();

  logger.info('Starting parallel provider queries', {
    providers,
    queryLength: query.length,
  });

  const queryPromises = providers.map(async (provider) => {
    const providerStart = Date.now();
    try {
      const result = await queryProvider(provider, query);
      return {
        provider,
        result: {
          ...result,
          durationMs: Date.now() - providerStart,
        },
      };
    } catch (error) {
      logger.error(`Provider query failed: ${provider}`, error, { provider });
      return {
        provider,
        result: {
          responseText: '',
          error: error instanceof Error ? error.message : 'Unknown error',
          durationMs: Date.now() - providerStart,
        },
      };
    }
  });

  const settledResults = await Promise.allSettled(queryPromises);

  for (const result of settledResults) {
    if (result.status === 'fulfilled') {
      results.set(result.value.provider, result.value.result);
    }
  }

  logger.info('Parallel provider queries completed', {
    totalDurationMs: Date.now() - startTime,
    successCount: Array.from(results.values()).filter((r) => !r.error).length,
    errorCount: Array.from(results.values()).filter((r) => r.error).length,
  });

  return results;
}

/**
 * Query a single AI provider with the user's query
 */
export async function queryProvider(
  provider: ProviderType,
  query: string
): Promise<ProviderQueryResult> {
  const startTime = Date.now();

  // Google Search is handled differently
  if (provider === 'google_search') {
    const result = await queryGoogleSearch(query);
    const durationMs = Date.now() - startTime;
    trackLLMPerformance('google', 'search', durationMs, undefined, !result.error);
    return { ...result, durationMs };
  }

  const operationType = `llm.provider.${provider}` as const;

  try {
    const result = await startSpan(
      operationType,
      `Query ${provider}`,
      async () => {
        const internalProvider = toInternalProvider(provider);
        if (!internalProvider) {
          throw new Error(`Provider ${provider} is not an LLM provider`);
        }
        const client = createLLMClient(internalProvider);
        return client.complete(
          [
            { role: 'system', content: config.llm.systemPrompt },
            { role: 'user', content: query },
          ],
          {
            temperature: 0.7,
            maxTokens: 2000,
            timeout: config.llm.timeout,
          }
        );
      },
      { provider, queryLength: query.length }
    );

    const durationMs = Date.now() - startTime;
    trackLLMPerformance(provider, result.model || 'unknown', durationMs, result.usage?.totalTokens, true);

    return {
      responseText: result.content,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    trackLLMPerformance(provider, 'unknown', durationMs, undefined, false);

    const errorMessage =
      error instanceof ProviderTimeoutError
        ? `Timeout after ${error.timeoutMs}ms`
        : error instanceof ProviderError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Unknown error';

    logger.error(`Error querying ${provider}`, error, { provider, query: query.slice(0, 100) });

    return {
      responseText: '',
      error: errorMessage,
      durationMs,
    };
  }
}

/**
 * Query Google Search using Custom Search API
 */
async function queryGoogleSearch(query: string): Promise<{ responseText: string; error?: string }> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

  if (!apiKey || !searchEngineId) {
    return {
      responseText: '',
      error: 'Google Search API not configured',
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.llm.timeout);

  try {
    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('cx', searchEngineId);
    url.searchParams.set('q', query);
    url.searchParams.set('num', '10');

    const response = await fetch(url.toString(), { signal: controller.signal });
    const data = await response.json();

    if (data.error) {
      return { responseText: '', error: data.error.message };
    }

    // Format search results as text
    const results = data.items || [];
    const responseText = results
      .map(
        (item: { title: string; snippet: string; link: string }, index: number) =>
          `${index + 1}. ${item.title}\n${item.snippet}\nURL: ${item.link}`
      )
      .join('\n\n');

    return { responseText };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      logger.error('Google Search timeout', null, { query: query.slice(0, 100) });
      return {
        responseText: '',
        error: `Timeout after ${config.llm.timeout}ms`,
      };
    }

    logger.error('Google Search error', error, { query: query.slice(0, 100) });
    return {
      responseText: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Find the position and paragraph where brand is mentioned
 */
function findMentionDetails(
  responseText: string,
  brandName: string,
  keywords: string[]
): { position: number | null; paragraph: number | null; context: string | null } {
  const lowerResponse = responseText.toLowerCase();
  const lowerBrandName = brandName.toLowerCase();

  // Split into paragraphs/sections
  const paragraphs = responseText.split(/\n\n|\n(?=\d+\.)/);

  for (let i = 0; i < paragraphs.length; i++) {
    const lowerPara = paragraphs[i].toLowerCase();
    if (
      lowerPara.includes(lowerBrandName) ||
      keywords.some((keyword) => lowerPara.includes(keyword.toLowerCase()))
    ) {
      // Extract context around the mention
      const brandIndex = lowerPara.indexOf(lowerBrandName);
      const start = Math.max(0, brandIndex - 100);
      const end = Math.min(paragraphs[i].length, brandIndex + brandName.length + 100);
      const context = paragraphs[i].slice(start, end);

      return {
        position: i + 1,
        paragraph: i + 1,
        context,
      };
    }
  }

  return { position: null, paragraph: null, context: null };
}

/**
 * Analyze a response for brand mentions with enhanced sentiment analysis
 */
export async function analyzeBrandMention(
  responseText: string,
  brandInfo: BrandAnalysisInput
): Promise<{
  brandMentioned: boolean;
  mentionPosition: number | null;
  mentionParagraph: number | null;
  mentionContext: 'featured' | 'recommended' | 'compared' | 'listed' | 'criticized' | 'neutral_mention' | null;
  prominence: 'primary' | 'secondary' | 'mentioned' | 'none';
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  sentimentReason: string | null;
  keyAttributes: string[];
  confidence: number;
  competitorsMentioned: string[];
  competitorDetails: Record<string, { position: number | null; sentiment: string | null }>;
}> {
  const { brandName, keywords, competitors } = brandInfo;
  const lowerResponse = responseText.toLowerCase();
  const lowerBrandName = brandName.toLowerCase();

  // Check for brand mention
  const brandMentioned =
    lowerResponse.includes(lowerBrandName) ||
    keywords.some((keyword) => lowerResponse.includes(keyword.toLowerCase()));

  // Find mention details
  const mentionDetails = brandMentioned
    ? findMentionDetails(responseText, brandName, keywords)
    : { position: null, paragraph: null, context: null };

  // Check for competitor mentions with positions
  const competitorsMentioned: string[] = [];
  const competitorDetails: Record<string, { position: number | null; sentiment: string | null }> = {};

  for (const competitor of competitors) {
    if (lowerResponse.includes(competitor.toLowerCase())) {
      competitorsMentioned.push(competitor);
      const competitorMentionDetails = findMentionDetails(responseText, competitor, []);
      competitorDetails[competitor] = {
        position: competitorMentionDetails.position,
        sentiment: null, // Could be analyzed separately if needed
      };
    }
  }

  // Default values
  let sentiment: 'positive' | 'neutral' | 'negative' | null = null;
  let sentimentReason: string | null = null;
  let mentionContext: 'featured' | 'recommended' | 'compared' | 'listed' | 'criticized' | 'neutral_mention' | null = null;
  let prominence: 'primary' | 'secondary' | 'mentioned' | 'none' = 'none';
  let keyAttributes: string[] = [];
  let confidence = 0;

  if (brandMentioned) {
    try {
      const analysisClient = createLLMClient('openai');
      const analysisResponse = await analysisClient.complete(
        [
          {
            role: 'system',
            content: SENTIMENT_ANALYSIS_PROMPT(brandName),
          },
          {
            role: 'user',
            content: `Analyze the sentiment for "${brandName}" in this text:\n\n${responseText.slice(0, 2000)}`,
          },
        ],
        {
          temperature: 0,
          maxTokens: 300,
          timeout: 15000,
        }
      );

      try {
        // Strip markdown code blocks if present
        let jsonContent = analysisResponse.content.trim();
        if (jsonContent.startsWith('```')) {
          jsonContent = jsonContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }
        const parsed = JSON.parse(jsonContent);
        sentiment = parsed.sentiment || 'neutral';
        confidence = parsed.confidence || 0.5;
        mentionContext = parsed.mentionContext || 'neutral_mention';
        prominence = parsed.prominence || 'mentioned';
        keyAttributes = parsed.keyAttributes || [];
        sentimentReason = parsed.sentimentReason || null;
      } catch {
        // If JSON parsing fails, try to extract sentiment from text
        const content = analysisResponse.content.toLowerCase();
        if (content.includes('positive')) sentiment = 'positive';
        else if (content.includes('negative')) sentiment = 'negative';
        else sentiment = 'neutral';
        confidence = 0.5;
      }
    } catch (error) {
      logger.warn('Enhanced sentiment analysis failed, using basic analysis', {
        brand: brandName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Fallback: Basic sentiment detection
      const positiveWords = ['best', 'great', 'excellent', 'recommended', 'top', '추천', '좋은', '최고'];
      const negativeWords = ['worst', 'bad', 'avoid', 'poor', 'problem', '문제', '나쁜', '피해야'];

      const hasPositive = positiveWords.some((w) =>
        lowerResponse.includes(w) &&
        Math.abs(lowerResponse.indexOf(w) - lowerResponse.indexOf(lowerBrandName)) < 100
      );
      const hasNegative = negativeWords.some((w) =>
        lowerResponse.includes(w) &&
        Math.abs(lowerResponse.indexOf(w) - lowerResponse.indexOf(lowerBrandName)) < 100
      );

      sentiment = hasPositive && !hasNegative ? 'positive' : hasNegative ? 'negative' : 'neutral';
      confidence = 0.4;

      // Determine prominence based on position
      if (mentionDetails.position === 1) {
        prominence = 'primary';
        mentionContext = 'featured';
      } else if (mentionDetails.position && mentionDetails.position <= 3) {
        prominence = 'secondary';
        mentionContext = 'recommended';
      } else {
        prominence = 'mentioned';
        mentionContext = 'listed';
      }
    }
  }

  return {
    brandMentioned,
    mentionPosition: mentionDetails.position,
    mentionParagraph: mentionDetails.paragraph,
    mentionContext,
    prominence,
    sentiment,
    sentimentReason,
    keyAttributes,
    confidence: brandMentioned ? confidence : 0,
    competitorsMentioned,
    competitorDetails,
  };
}

/**
 * Analyze multiple provider results in parallel
 */
export async function analyzeResultsParallel(
  providerResults: Map<ProviderType, ProviderQueryResult>,
  brandInfo: BrandAnalysisInput
): Promise<BrandDetectionResult[]> {
  const analysisPromises = Array.from(providerResults.entries()).map(
    async ([provider, result]): Promise<BrandDetectionResult> => {
      if (result.error || !result.responseText) {
        return {
          provider,
          responseText: result.responseText,
          brandMentioned: false,
          mentionPosition: null,
          mentionParagraph: null,
          mentionContext: null,
          prominence: 'none',
          sentiment: null,
          sentimentReason: null,
          keyAttributes: [],
          confidence: 0,
          competitorsMentioned: [],
          competitorDetails: {},
          error: result.error,
          durationMs: result.durationMs,
        };
      }

      try {
        const analysis = await analyzeBrandMention(result.responseText, brandInfo);
        return {
          provider,
          responseText: result.responseText,
          ...analysis,
          durationMs: result.durationMs,
        };
      } catch (error) {
        logger.error('Brand analysis failed', error, { provider });
        return {
          provider,
          responseText: result.responseText,
          brandMentioned: false,
          mentionPosition: null,
          mentionParagraph: null,
          mentionContext: null,
          prominence: 'none',
          sentiment: null,
          sentimentReason: null,
          keyAttributes: [],
          confidence: 0,
          competitorsMentioned: [],
          competitorDetails: {},
          error: error instanceof Error ? error.message : 'Analysis failed',
          durationMs: result.durationMs,
        };
      }
    }
  );

  return Promise.all(analysisPromises);
}

/**
 * Generate enhanced insights from all scan results
 */
export async function generateInsights(
  brandInfo: BrandAnalysisInput & { industry?: string },
  results: BrandDetectionResult[]
): Promise<EnhancedInsights> {
  // Filter out failed results for scoring
  const validResults = results.filter((r) => !r.error);

  // Calculate overall visibility score
  const mentionedCount = validResults.filter((r) => r.brandMentioned).length;
  const totalProviders = validResults.length;

  if (totalProviders === 0) {
    return {
      overallAssessment: '모든 AI 제공자 쿼리가 실패했습니다. 나중에 다시 시도해 주세요.',
      overallVisibilityScore: 0,
      strengths: [],
      weaknesses: [{
        title: '분석 실패',
        description: '모든 AI 제공자 쿼리가 실패했습니다',
        impact: '브랜드 가시성을 평가할 수 없습니다',
      }],
      opportunities: [],
      recommendations: [{
        title: '재시도 필요',
        description: '네트워크 연결을 확인하고 다시 스캔을 시도해 주세요',
        priority: 'high',
        effort: 'quick',
        expectedImpact: '정확한 가시성 분석 가능',
      }],
      competitorInsights: [],
      aeoTips: [],
      competitorAnalysis: {},
    };
  }

  // Base score calculation
  const baseScore = (mentionedCount / totalProviders) * 100;

  // Position bonus (earlier mentions = better)
  const positionBonus =
    validResults
      .filter((r) => r.brandMentioned && r.mentionPosition)
      .reduce((sum, r) => {
        if (r.prominence === 'primary') return sum + 15;
        if (r.prominence === 'secondary') return sum + 10;
        if (r.mentionPosition && r.mentionPosition <= 3) return sum + 8;
        if (r.mentionPosition && r.mentionPosition <= 5) return sum + 5;
        return sum + 2;
      }, 0) / Math.max(mentionedCount, 1);

  // Sentiment bonus
  const sentimentBonus = validResults
    .filter((r) => r.brandMentioned)
    .reduce((sum, r) => {
      if (r.sentiment === 'positive') return sum + 8;
      if (r.sentiment === 'negative') return sum - 8;
      return sum;
    }, 0);

  const overallVisibilityScore = Math.min(
    100,
    Math.max(0, Math.round(baseScore + positionBonus + sentimentBonus))
  );

  // Analyze competitor mentions
  const competitorAnalysis: Record<string, number> = {};
  for (const competitor of brandInfo.competitors) {
    const mentionCount = validResults.filter((r) =>
      r.competitorsMentioned.includes(competitor)
    ).length;
    competitorAnalysis[competitor] = Math.round((mentionCount / totalProviders) * 100);
  }

  // Prepare provider results summary
  const providerResults = validResults.map((r) => ({
    provider: r.provider,
    mentioned: r.brandMentioned,
    sentiment: r.sentiment,
    position: r.mentionPosition,
    prominence: r.prominence,
  }));

  // Generate insights using AI
  try {
    const insightClient = createLLMClient('openai');
    const insightResponse = await insightClient.complete(
      [
        {
          role: 'system',
          content: 'You are an AI visibility expert. Generate comprehensive insights in Korean. Respond with ONLY valid JSON.',
        },
        {
          role: 'user',
          content: INSIGHTS_GENERATION_PROMPT({
            brandName: brandInfo.brandName,
            industry: brandInfo.industry || 'other',
            query: brandInfo.query,
            visibilityScore: overallVisibilityScore,
            mentionedCount,
            totalProviders,
            competitorAnalysis,
            providerResults,
          }),
        },
      ],
      {
        temperature: 0.7,
        maxTokens: 1500,
        timeout: 20000,
      }
    );

    try {
      // Strip markdown code blocks if present
      let jsonContent = insightResponse.content.trim();
      if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      const insights = JSON.parse(jsonContent);
      return {
        overallAssessment: insights.overallAssessment || `${brandInfo.brandName}의 AI 가시성 점수는 ${overallVisibilityScore}점입니다.`,
        overallVisibilityScore,
        strengths: insights.strengths || [],
        weaknesses: insights.weaknesses || [],
        opportunities: insights.opportunities || [],
        recommendations: insights.recommendations || [],
        competitorInsights: insights.competitorInsights || [],
        aeoTips: insights.aeoTips || [],
        competitorAnalysis,
      };
    } catch {
      throw new Error('Failed to parse insights JSON');
    }
  } catch (error) {
    logger.error('Insight generation error', error, { brand: brandInfo.brandName });

    // Generate fallback insights based on data
    const strengths: EnhancedInsights['strengths'] = [];
    const weaknesses: EnhancedInsights['weaknesses'] = [];
    const recommendations: EnhancedInsights['recommendations'] = [];

    if (mentionedCount > 0) {
      strengths.push({
        title: 'AI 플랫폼 인지도',
        description: `${mentionedCount}개의 AI 플랫폼에서 브랜드가 인식되고 있습니다`,
        evidence: `${totalProviders}개 중 ${mentionedCount}개 플랫폼에서 언급됨`,
      });
    }

    if (mentionedCount < totalProviders) {
      weaknesses.push({
        title: '커버리지 부족',
        description: `일부 AI 플랫폼에서 브랜드가 언급되지 않습니다`,
        impact: `${totalProviders - mentionedCount}개 플랫폼에서 가시성 확보 필요`,
      });
    }

    const negativeResults = validResults.filter((r) => r.sentiment === 'negative');
    if (negativeResults.length > 0) {
      weaknesses.push({
        title: '부정적 감성',
        description: `일부 플랫폼에서 부정적으로 언급되고 있습니다`,
        impact: `${negativeResults.length}개 플랫폼에서 부정적 감성 감지`,
      });
    }

    recommendations.push({
      title: '콘텐츠 최적화',
      description: 'AI가 쉽게 이해하고 추천할 수 있도록 구조화된 콘텐츠를 작성하세요',
      priority: 'high',
      effort: 'moderate',
      expectedImpact: 'AI 가시성 10-20% 향상 예상',
    });

    return {
      overallAssessment: `${brandInfo.brandName}의 현재 AI 가시성 점수는 ${overallVisibilityScore}점입니다. ${mentionedCount}/${totalProviders} AI 플랫폼에서 언급되고 있습니다.`,
      overallVisibilityScore,
      strengths,
      weaknesses,
      opportunities: [],
      recommendations,
      competitorInsights: [],
      aeoTips: [
        'FAQ 페이지를 구조화된 데이터로 마크업하세요',
        '브랜드 고유의 전문성을 강조하는 콘텐츠를 작성하세요',
        '정기적으로 AI 가시성을 모니터링하고 트렌드를 추적하세요',
      ],
      competitorAnalysis,
    };
  }
}
