import { createLLMClient } from '@/services/llm';
import type { ProviderType } from '@/types/database';
import { toInternalProvider } from '@/types/database';
import { config } from '@/lib/config';
import { logger } from '@/lib/logger';
import { ProviderError, ProviderTimeoutError } from '@/lib/errors';
import {
  startSpan,
  trackLLMPerformance,
  trackScanPerformance,
} from '@/lib/performance';

export interface BrandDetectionResult {
  provider: ProviderType;
  responseText: string;
  brandMentioned: boolean;
  mentionPosition: number | null;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  confidence: number;
  competitorsMentioned: string[];
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
 * Analyze a response for brand mentions
 */
export async function analyzeBrandMention(
  responseText: string,
  brandInfo: BrandAnalysisInput
): Promise<{
  brandMentioned: boolean;
  mentionPosition: number | null;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  confidence: number;
  competitorsMentioned: string[];
}> {
  const { brandName, keywords, competitors } = brandInfo;
  const lowerResponse = responseText.toLowerCase();
  const lowerBrandName = brandName.toLowerCase();

  // Check for brand mention
  const brandMentioned =
    lowerResponse.includes(lowerBrandName) ||
    keywords.some((keyword) => lowerResponse.includes(keyword.toLowerCase()));

  // Find mention position (which result/paragraph mentions the brand)
  let mentionPosition: number | null = null;
  if (brandMentioned) {
    const paragraphs = responseText.split(/\n\n|\n(?=\d+\.)/);
    for (let i = 0; i < paragraphs.length; i++) {
      const lowerPara = paragraphs[i].toLowerCase();
      if (
        lowerPara.includes(lowerBrandName) ||
        keywords.some((keyword) => lowerPara.includes(keyword.toLowerCase()))
      ) {
        mentionPosition = i + 1;
        break;
      }
    }
  }

  // Check for competitor mentions
  const competitorsMentioned = competitors.filter((competitor) =>
    lowerResponse.includes(competitor.toLowerCase())
  );

  // Analyze sentiment using OpenAI
  let sentiment: 'positive' | 'neutral' | 'negative' | null = null;
  let confidence = 0;

  if (brandMentioned) {
    try {
      const analysisClient = createLLMClient('openai');
      const analysisResponse = await analysisClient.complete(
        [
          {
            role: 'system',
            content: `You are analyzing text for brand sentiment.
Respond with ONLY a JSON object in this exact format:
{"sentiment": "positive" | "neutral" | "negative", "confidence": 0.0-1.0}

Analyze how the brand "${brandName}" is portrayed in the context.`,
          },
          {
            role: 'user',
            content: `Analyze the sentiment for "${brandName}" in this text:\n\n${responseText.slice(0, 1500)}`,
          },
        ],
        {
          temperature: 0,
          maxTokens: 100,
          timeout: 10000, // Shorter timeout for sentiment analysis
        }
      );

      const parsed = JSON.parse(analysisResponse.content);
      sentiment = parsed.sentiment;
      confidence = parsed.confidence;
    } catch (error) {
      logger.warn('Sentiment analysis failed, using fallback', {
        brand: brandName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      sentiment = 'neutral';
      confidence = 0.5;
    }
  }

  return {
    brandMentioned,
    mentionPosition,
    sentiment,
    confidence: brandMentioned ? confidence : 0,
    competitorsMentioned,
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
          sentiment: null,
          confidence: 0,
          competitorsMentioned: [],
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
          sentiment: null,
          confidence: 0,
          competitorsMentioned: [],
          error: error instanceof Error ? error.message : 'Analysis failed',
          durationMs: result.durationMs,
        };
      }
    }
  );

  return Promise.all(analysisPromises);
}

/**
 * Generate insights from all scan results
 */
export async function generateInsights(
  brandInfo: BrandAnalysisInput,
  results: BrandDetectionResult[]
): Promise<{
  overallVisibilityScore: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  competitorAnalysis: Record<string, number>;
}> {
  // Filter out failed results for scoring
  const validResults = results.filter((r) => !r.error);

  // Calculate overall visibility score
  const mentionedCount = validResults.filter((r) => r.brandMentioned).length;
  const totalProviders = validResults.length;

  if (totalProviders === 0) {
    return {
      overallVisibilityScore: 0,
      strengths: [],
      weaknesses: ['모든 AI 제공자 쿼리가 실패했습니다'],
      recommendations: ['나중에 다시 스캔을 시도해 주세요'],
      competitorAnalysis: {},
    };
  }

  const baseScore = (mentionedCount / totalProviders) * 100;

  // Adjust for position (earlier mentions = better)
  const positionBonus =
    validResults
      .filter((r) => r.brandMentioned && r.mentionPosition)
      .reduce((sum, r) => {
        const posBonus = r.mentionPosition! <= 3 ? 10 : r.mentionPosition! <= 5 ? 5 : 0;
        return sum + posBonus;
      }, 0) / Math.max(mentionedCount, 1);

  // Adjust for sentiment
  const sentimentBonus = validResults
    .filter((r) => r.brandMentioned)
    .reduce((sum, r) => {
      if (r.sentiment === 'positive') return sum + 5;
      if (r.sentiment === 'negative') return sum - 5;
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

  // Generate insights using AI
  try {
    const insightClient = createLLMClient('openai');
    const insightResponse = await insightClient.complete(
      [
        {
          role: 'system',
          content: `You are an AI visibility expert analyzing brand presence across AI platforms.
Generate insights in Korean. Respond with ONLY a JSON object:
{
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2"],
  "recommendations": ["recommendation1", "recommendation2", "recommendation3"]
}

Keep each item concise (under 50 characters).`,
        },
        {
          role: 'user',
          content: `Analyze visibility for brand "${brandInfo.brandName}":
- Query used: "${brandInfo.query}"
- Mentioned in ${mentionedCount}/${totalProviders} AI platforms
- Visibility score: ${overallVisibilityScore}/100
- Competitors mentioned: ${Object.entries(competitorAnalysis).map(([c, s]) => `${c}: ${s}%`).join(', ')}
- Results summary: ${validResults.map((r) => `${r.provider}: ${r.brandMentioned ? 'mentioned' : 'not mentioned'}, sentiment: ${r.sentiment}`).join('; ')}`,
        },
      ],
      {
        temperature: 0.7,
        maxTokens: 500,
        timeout: 15000,
      }
    );

    const insights = JSON.parse(insightResponse.content);
    return {
      overallVisibilityScore,
      strengths: insights.strengths || [],
      weaknesses: insights.weaknesses || [],
      recommendations: insights.recommendations || [],
      competitorAnalysis,
    };
  } catch (error) {
    logger.error('Insight generation error', error, { brand: brandInfo.brandName });
    // Fallback insights
    return {
      overallVisibilityScore,
      strengths: mentionedCount > 0 ? ['AI 플랫폼에서 브랜드가 인식되고 있습니다'] : [],
      weaknesses:
        mentionedCount < totalProviders ? ['일부 AI 플랫폼에서 브랜드가 언급되지 않습니다'] : [],
      recommendations: ['키워드 최적화를 통해 AI 가시성을 높이세요'],
      competitorAnalysis,
    };
  }
}
