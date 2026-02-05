import { inngest } from '../client';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  queryProvider,
  analyzeBrandMention,
  type BrandAnalysisInput,
} from '@/services/brand-detection';
import {
  calculateAggregatedMetrics,
  type QueryResult,
  type ProviderResult,
} from '@/services/batch-scan';
import { calculateExposureScore, type ExposureDataPoint } from '@/services/exposure-scoring';
import type { ProviderType } from '@/types/database';
import type { DerivedQuery } from '@/services/query-expansion/types';

// Lazy-initialized Supabase admin client
let _supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabaseAdmin;
}

interface BatchScanEventData {
  batchScanId: string;
  brandId: string;
  userId: string;
  baseQuery: string;
  derivedQueries: DerivedQuery[];
  providers: ProviderType[];
  expansionLevel: string;
}

/**
 * Process Batch Scan Function
 * Handles multi-query batch scanning with aggregated metrics
 */
export const processBatchScanFunction = inngest.createFunction(
  {
    id: 'process-batch-scan',
    name: 'Process Batch Visibility Scan',
    retries: 2,
    concurrency: {
      limit: 3,
    },
  },
  { event: 'scan/batch.requested' },
  async ({ event, step }) => {
    const { batchScanId, brandId, userId, baseQuery, derivedQueries, providers } = event.data as BatchScanEventData;
    const startTime = Date.now();

    // Step 1: Get brand information
    const brandInfo = await step.run('get-brand-info', async () => {
      const { data: brand, error } = await getSupabaseAdmin()
        .from('brands')
        .select('name, description, keywords, competitors')
        .eq('id', brandId)
        .single();

      if (error || !brand) {
        throw new Error(`Brand not found: ${brandId}`);
      }

      return brand;
    });

    // Step 2: Update batch scan status to running
    await step.run('update-status-running', async () => {
      await getSupabaseAdmin()
        .from('batch_scans')
        .update({
          status: 'running',
          started_at: new Date().toISOString(),
        })
        .eq('id', batchScanId);
    });

    // Step 3: Prepare all queries (original + derived)
    const allQueries = [
      { query: baseQuery, type: 'intent_variation', intent: '원본 쿼리' },
      ...derivedQueries.map(dq => ({
        query: dq.query,
        type: dq.type,
        intent: dq.intent,
      })),
    ];

    // Step 4: Process all queries
    const queryResults: QueryResult[] = [];
    const keywordExposureData: Map<string, ExposureDataPoint[]> = new Map();

    // Process queries in batches to avoid overwhelming providers
    const BATCH_SIZE = 3;
    for (let i = 0; i < allQueries.length; i += BATCH_SIZE) {
      const queryBatch = allQueries.slice(i, i + BATCH_SIZE);
      
      const batchResults = await step.run(`process-query-batch-${i}`, async () => {
        const results: QueryResult[] = [];
        
        for (const queryItem of queryBatch) {
          const brandAnalysisInput: BrandAnalysisInput = {
            brandName: brandInfo.name,
            brandDescription: brandInfo.description || '',
            keywords: brandInfo.keywords || [],
            competitors: brandInfo.competitors || [],
            query: queryItem.query,
          };

          // Query all providers in parallel
          const providerPromises = providers.map(async (provider): Promise<ProviderResult> => {
            const providerStartTime = Date.now();
            try {
              const { responseText, error, durationMs } = await queryProvider(provider, queryItem.query);

              if (error) {
                return {
                  provider,
                  status: 'error',
                  error,
                  brandMentioned: false,
                  responseTimeMs: durationMs || Date.now() - providerStartTime,
                };
              }

              const analysis = await analyzeBrandMention(responseText, brandAnalysisInput);

              return {
                provider,
                status: 'success',
                content: responseText,
                brandMentioned: analysis.brandMentioned,
                mentionPosition: analysis.mentionPosition || undefined,
                sentiment: analysis.sentiment as 'positive' | 'neutral' | 'negative' | undefined,
                responseTimeMs: durationMs || Date.now() - providerStartTime,
              };
            } catch (err) {
              return {
                provider,
                status: 'error',
                error: err instanceof Error ? err.message : 'Unknown error',
                brandMentioned: false,
                responseTimeMs: Date.now() - providerStartTime,
              };
            }
          });

          const providerResults = await Promise.all(providerPromises);

          // Calculate query-level stats
          const successResults = providerResults.filter(r => r.status === 'success');
          const mentionedResults = successResults.filter(r => r.brandMentioned);
          const positions = mentionedResults
            .map(r => r.mentionPosition)
            .filter((p): p is number => p !== undefined);

          const queryResult: QueryResult = {
            queryId: `${batchScanId}-${i}-${queryBatch.indexOf(queryItem)}`,
            query: queryItem.query,
            queryType: queryItem.type,
            providerResults,
            brandMentioned: mentionedResults.length > 0,
            avgMentionPosition: positions.length > 0
              ? positions.reduce((a, b) => a + b, 0) / positions.length
              : null,
            overallSentiment: calculateOverallSentiment(mentionedResults),
            executionTimeMs: providerResults.reduce((sum, r) => sum + r.responseTimeMs, 0),
          };

          results.push(queryResult);

          // Collect keyword exposure data
          for (const keyword of brandInfo.keywords || []) {
            const exposurePoints = keywordExposureData.get(keyword) || [];
            for (const pr of providerResults) {
              if (pr.status === 'success') {
                exposurePoints.push({
                  provider: pr.provider,
                  mentioned: Boolean(pr.brandMentioned && pr.content?.toLowerCase().includes(keyword.toLowerCase())),
                  position: pr.mentionPosition,
                  sentiment: pr.sentiment,
                  prominence: determineProminence(pr.mentionPosition),
                });
              }
            }
            keywordExposureData.set(keyword, exposurePoints);
          }
        }

        return results;
      });

      queryResults.push(...batchResults);

      // Update progress
      await step.run(`update-progress-${i}`, async () => {
        const completed = queryResults.length;
        const failed = queryResults.filter(r => 
          r.providerResults.every(pr => pr.status === 'error')
        ).length;

        await getSupabaseAdmin()
          .from('batch_scans')
          .update({
            completed_queries: completed,
            failed_queries: failed,
          })
          .eq('id', batchScanId);
      });
    }

    // Step 5: Calculate aggregated metrics
    const aggregatedMetrics = await step.run('calculate-aggregated-metrics', async () => {
      return calculateAggregatedMetrics(queryResults, providers);
    });

    // Step 6: Store query expansion results
    await step.run('store-query-results', async () => {
      const updates = queryResults.map((qr, index) => ({
        batch_scan_id: batchScanId,
        original_query: baseQuery,
        derived_query: qr.query,
        query_type: qr.queryType,
        brand_mentioned: qr.brandMentioned,
        mention_position: qr.avgMentionPosition ? Math.round(qr.avgMentionPosition) : null,
        provider_results: Object.fromEntries(
          qr.providerResults.map(pr => [pr.provider, {
            mentioned: pr.brandMentioned,
            position: pr.mentionPosition,
            sentiment: pr.sentiment,
          }])
        ),
      }));

      // Update existing query_expansions records
      for (let i = 0; i < updates.length; i++) {
        await getSupabaseAdmin()
          .from('query_expansions')
          .update({
            brand_mentioned: updates[i].brand_mentioned,
            mention_position: updates[i].mention_position,
            provider_results: updates[i].provider_results,
          })
          .eq('batch_scan_id', batchScanId)
          .eq('derived_query', updates[i].derived_query);
      }
    });

    // Step 7: Calculate and store keyword exposure
    await step.run('store-keyword-exposure', async () => {
      for (const [keyword, dataPoints] of keywordExposureData) {
        if (dataPoints.length === 0) continue;

        const exposureScore = calculateExposureScore({
          keyword,
          brandId,
          results: dataPoints,
        });

        // Prepare provider scores
        const providerScores: Record<string, number> = {};
        for (const bp of exposureScore.breakdown) {
          providerScores[bp.provider] = bp.score;
        }

        // Calculate sentiment distribution
        const sentimentDist = { positive: 0, neutral: 0, negative: 0 };
        for (const dp of dataPoints) {
          if (dp.sentiment) sentimentDist[dp.sentiment]++;
        }

        // Calculate prominence breakdown
        const prominenceBreakdown: Record<string, number> = {};
        for (const dp of dataPoints) {
          if (dp.prominence) {
            prominenceBreakdown[dp.prominence] = (prominenceBreakdown[dp.prominence] || 0) + 1;
          }
        }

        await getSupabaseAdmin()
          .from('keyword_exposure')
          .upsert({
            brand_id: brandId,
            batch_scan_id: batchScanId,
            keyword,
            exposure_score: exposureScore.overallScore,
            mention_count: dataPoints.filter(dp => dp.mentioned).length,
            avg_position: exposureScore.breakdown.length > 0
              ? exposureScore.breakdown.reduce((sum, b) => sum + (b.avgPosition || 0), 0) / exposureScore.breakdown.length
              : null,
            sentiment_distribution: sentimentDist,
            provider_scores: providerScores,
            prominence_breakdown: prominenceBreakdown,
            recorded_at: new Date().toISOString(),
          }, {
            onConflict: 'brand_id,recorded_at::date,keyword',
          });
      }
    });

    // Step 8: Update batch scan as completed
    await step.run('complete-batch-scan', async () => {
      const executionTime = Date.now() - startTime;
      const failed = queryResults.filter(r => 
        r.providerResults.every(pr => pr.status === 'error')
      ).length;

      await getSupabaseAdmin()
        .from('batch_scans')
        .update({
          status: 'completed',
          completed_queries: queryResults.length,
          failed_queries: failed,
          aggregated_score: aggregatedMetrics.overallVisibilityScore,
          aggregated_metrics: aggregatedMetrics,
          completed_at: new Date().toISOString(),
        })
        .eq('id', batchScanId);
    });

    // Step 9: Send completion event
    await step.sendEvent('batch-scan-completed', {
      name: 'scan/batch.completed',
      data: {
        batchScanId,
        brandId,
        userId,
        aggregatedScore: aggregatedMetrics.overallVisibilityScore,
        totalQueries: queryResults.length,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      success: true,
      batchScanId,
      totalQueries: queryResults.length,
      aggregatedScore: aggregatedMetrics.overallVisibilityScore,
      executionTimeMs: Date.now() - startTime,
    };
  }
);

/**
 * Calculate overall sentiment from results
 */
function calculateOverallSentiment(
  results: ProviderResult[]
): 'positive' | 'neutral' | 'negative' | null {
  const sentiments = results
    .map(r => r.sentiment)
    .filter((s): s is 'positive' | 'neutral' | 'negative' => s !== undefined);

  if (sentiments.length === 0) return null;

  const counts = { positive: 0, neutral: 0, negative: 0 };
  for (const s of sentiments) {
    counts[s]++;
  }

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as 'positive' | 'neutral' | 'negative';
}

/**
 * Determine prominence level from position
 */
function determineProminence(position: number | undefined): 'featured' | 'primary' | 'secondary' | 'mentioned' | undefined {
  if (position === undefined) return undefined;
  if (position === 1) return 'featured';
  if (position <= 2) return 'primary';
  if (position <= 4) return 'secondary';
  return 'mentioned';
}

// processBatchScanFunction is already exported above
