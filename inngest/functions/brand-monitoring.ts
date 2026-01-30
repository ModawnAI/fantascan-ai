import { inngest } from '../client';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  queryProvider,
  analyzeBrandMention,
  generateInsights,
  type BrandAnalysisInput,
  type BrandDetectionResult,
} from '@/services/brand-detection';
import {
  calculateShareOfVoice,
  extractCitations,
  generateRecommendations,
  checkAlerts,
  checkHallucination,
  extractBrandFacts,
} from '@/services/analytics';
import type { ProviderType, AlertConfig } from '@/types/database';

// Lazy-initialized Supabase admin client to avoid build-time env requirement
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

/**
 * Process Brand Scan Function
 * Triggered when a new scan is created via the API
 */
export const processBrandScanFunction = inngest.createFunction(
  {
    id: 'process-brand-scan',
    name: 'Process Brand Visibility Scan',
    retries: 3,
    concurrency: {
      limit: 5,
    },
  },
  { event: 'scan/brand.requested' },
  async ({ event, step }) => {
    const { scanId, brandId, userId, query, providers } = event.data;

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

    // Step 1.5: Get query_id from scan_queries (created by API before triggering Inngest)
    const queryId = await step.run('get-query-id', async () => {
      const { data: scanQuery, error } = await getSupabaseAdmin()
        .from('scan_queries')
        .select('id')
        .eq('scan_id', scanId)
        .single();

      if (error || !scanQuery) {
        // If no query record exists, create one
        const { data: newQuery, error: insertError } = await getSupabaseAdmin()
          .from('scan_queries')
          .insert({
            scan_id: scanId,
            query_text: query,
            query_type: 'recommendation',
          })
          .select('id')
          .single();

        if (insertError || !newQuery) {
          throw new Error(`Failed to create scan query: ${insertError?.message}`);
        }
        return newQuery.id;
      }

      return scanQuery.id;
    });

    // Step 2: Update scan status to processing
    await step.run('update-scan-status-processing', async () => {
      await getSupabaseAdmin()
        .from('scans')
        .update({ status: 'processing' })
        .eq('id', scanId);
    });

    // Step 3: Query ALL providers in PARALLEL
    const results = await step.run('query-all-providers-parallel', async () => {
      const brandAnalysisInput: BrandAnalysisInput = {
        brandName: brandInfo.name,
        brandDescription: brandInfo.description || '',
        keywords: brandInfo.keywords || [],
        competitors: brandInfo.competitors || [],
        query,
      };

      // Execute all provider queries in parallel
      const providerPromises = providers.map(async (provider: ProviderType) => {
        const startTime = Date.now();
        try {
          const { responseText, error, durationMs } = await queryProvider(provider, query);

          if (error) {
            console.error(`Provider ${provider} error:`, error);
            return {
              provider,
              responseText: '',
              brandMentioned: false,
              mentionPosition: null,
              sentiment: null,
              confidence: 0,
              competitorsMentioned: [],
              error,
              durationMs: durationMs || Date.now() - startTime,
            };
          }

          // Analyze for brand mention
          const analysis = await analyzeBrandMention(responseText, brandAnalysisInput);

          return {
            provider,
            responseText,
            ...analysis,
            error: undefined as string | undefined,
            durationMs: durationMs || Date.now() - startTime,
          };
        } catch (err) {
          console.error(`Provider ${provider} failed:`, err);
          return {
            provider,
            responseText: '',
            brandMentioned: false,
            mentionPosition: null,
            sentiment: null,
            confidence: 0,
            competitorsMentioned: [],
            error: err instanceof Error ? err.message : 'Unknown error',
            durationMs: Date.now() - startTime,
          };
        }
      });

      // Wait for all providers to complete
      return Promise.all(providerPromises);
    });

    // Step 4: Store all results in parallel
    await step.run('store-all-results', async () => {
      // Helper to convert competitor array to Record<string, number>
      const competitorsToRecord = (competitors: string[]): Record<string, number> => {
        const record: Record<string, number> = {};
        competitors.forEach((c, index) => {
          record[c] = index + 1; // Position-based score (1 = first mentioned)
        });
        return record;
      };

      // Map provider to category (DB constraint: 'ai' or 'search')
      const getProviderCategory = (provider: string): string => {
        const categories: Record<string, string> = {
          gemini: 'ai',
          openai: 'ai',
          claude: 'ai',
          anthropic: 'ai',
          grok: 'ai',
          perplexity: 'search',
          google: 'search',
          google_search: 'search',
        };
        return categories[provider] || 'ai';
      };

      // Map provider name to DB enum value
      const mapProviderToDbValue = (provider: string): string => {
        const providerMap: Record<string, string> = {
          claude: 'anthropic',
          google: 'google_search',
        };
        return providerMap[provider] || provider;
      };

      const insertPromises = results.map((result) =>
        getSupabaseAdmin().from('scan_results').insert({
          scan_id: scanId,
          query_id: queryId,
          provider: mapProviderToDbValue(result.provider),
          provider_category: getProviderCategory(result.provider),
          status: result.error ? 'error' : 'success',
          content: result.responseText,
          brand_mentioned: result.brandMentioned,
          mention_position: result.mentionPosition,
          mention_context: result.brandMentioned ? result.responseText.substring(0, 500) : null,
          sentiment: result.sentiment || null, // text: 'positive', 'neutral', 'negative'
          competitor_mentions: competitorsToRecord((result.competitorsMentioned || []).filter((c): c is string => typeof c === 'string')),
          response_time_ms: result.durationMs || 0,
          error_message: result.error || null,
        })
      );

      await Promise.all(insertPromises);
    });

    // Step 5: Generate insights
    const insights = await step.run('generate-insights', async () => {
      return generateInsights(
        {
          brandName: brandInfo.name,
          brandDescription: brandInfo.description || '',
          keywords: brandInfo.keywords || [],
          competitors: brandInfo.competitors || [],
          query,
        },
        results as BrandDetectionResult[]
      );
    });

    // Step 5.1: Calculate Share of Voice
    const sovData = await step.run('calculate-share-of-voice', async () => {
      return calculateShareOfVoice({
        brandName: brandInfo.name,
        competitors: brandInfo.competitors || [],
        results: results as BrandDetectionResult[],
      });
    });

    // Step 5.2: Extract citations from responses
    await step.run('extract-citations', async () => {
      const citationPromises = results.map(async (result) => {
        if (result.error || !result.responseText) return;
        
        // Get scan_result_id for this provider
        const { data: scanResult } = await getSupabaseAdmin()
          .from('scan_results')
          .select('id')
          .eq('scan_id', scanId)
          .eq('provider', result.provider)
          .single();
        
        if (!scanResult) return;
        
        const citations = extractCitations({
          responseText: result.responseText,
          provider: result.provider as ProviderType,
          scanId,
          scanResultId: scanResult.id,
          brandId,
        });
        
        if (citations.length > 0) {
          await getSupabaseAdmin().from('citations').insert(citations);
        }
      });
      
      await Promise.all(citationPromises);
    });

    // Step 5.3: Check for hallucinations
    const hallucinationResults = await step.run('check-hallucinations', async () => {
      const brandFacts = extractBrandFacts(brandInfo.description || '');
      const hallucinationChecks = await Promise.all(
        results
          .filter(r => !r.error && r.brandMentioned && r.responseText)
          .map(async (result) => {
            const check = await checkHallucination({
              brandName: brandInfo.name,
              brandDescription: brandInfo.description || '',
              brandFacts,
              aiResponse: result.responseText,
              provider: result.provider,
            });
            return { provider: result.provider, ...check };
          })
      );
      
      // Update scan_results with hallucination data
      for (const check of hallucinationChecks) {
        await getSupabaseAdmin()
          .from('scan_results')
          .update({
            accuracy_score: check.accuracyScore,
            has_hallucination: check.hasHallucination,
            hallucination_details: check.inaccuracies.length > 0
              ? JSON.stringify(check.inaccuracies)
              : null,
          })
          .eq('scan_id', scanId)
          .eq('provider', check.provider);
      }
      
      return hallucinationChecks;
    });

    // Step 5.4: Generate content recommendations
    await step.run('generate-recommendations', async () => {
      const recommendations = await generateRecommendations({
        brandName: brandInfo.name,
        brandDescription: brandInfo.description || '',
        keywords: brandInfo.keywords || [],
        competitors: brandInfo.competitors || [],
        results: results as BrandDetectionResult[],
        scanId,
        brandId,
      });
      
      if (recommendations.length > 0) {
        await getSupabaseAdmin().from('content_recommendations').insert(
          recommendations.map(rec => ({
            ...rec,
            status: 'pending',
          }))
        );
      }
    });

    // Step 5.5: Store competitor analysis
    await step.run('store-competitor-analysis', async () => {
      if (sovData.competitorAnalysis.length > 0) {
        await getSupabaseAdmin().from('competitor_analysis').insert(
          sovData.competitorAnalysis.map(ca => ({
            ...ca,
            scan_id: scanId,
            brand_id: brandId,
          }))
        );
      }
    });

    // Step 5.6: Store visibility history
    await step.run('store-visibility-history', async () => {
      // Calculate provider scores
      const providerScores: Record<string, number> = {};
      results.forEach((result) => {
        if (!result.error) {
          providerScores[result.provider] = result.brandMentioned ? 100 : 0;
        }
      });
      
      // Calculate competitor SOV
      const competitorSov: Record<string, number> = {};
      sovData.competitorSOV.forEach(c => {
        competitorSov[c.brandName] = c.percentage;
      });
      
      await getSupabaseAdmin().from('visibility_history').upsert({
        brand_id: brandId,
        scan_id: scanId,
        recorded_at: new Date().toISOString(),
        visibility_score: insights.overallVisibilityScore,
        ai_visibility_score: 0, // Will be calculated below
        seo_visibility_score: 0, // Will be calculated below
        provider_scores: providerScores,
        competitor_sov: competitorSov,
        mentions_count: results.filter(r => r.brandMentioned).length,
        total_providers: results.filter(r => !r.error).length,
      }, {
        onConflict: 'brand_id,recorded_at::date',
      });
    });

    // Step 5.7: Check and trigger alerts
    await step.run('check-alerts', async () => {
      // Get alert configs for this brand
      const { data: alertConfigs } = await getSupabaseAdmin()
        .from('alert_configs')
        .select('*')
        .eq('brand_id', brandId)
        .eq('is_active', true);
      
      if (!alertConfigs || alertConfigs.length === 0) return;
      
      // Get previous scan data for comparison
      const { data: previousHistory } = await getSupabaseAdmin()
        .from('visibility_history')
        .select('*')
        .eq('brand_id', brandId)
        .order('recorded_at', { ascending: false })
        .limit(2);
      
      const previousData = previousHistory && previousHistory.length > 1
        ? previousHistory[1]
        : null;
      
      // Check for hallucinations
      const hasHallucination = hallucinationResults.some(h => h.hasHallucination);
      const hallucinationDetails = hallucinationResults
        .filter(h => h.hasHallucination)
        .map(h => `${h.provider}: ${h.inaccuracies.map(i => i.claimedFact).join(', ')}`)
        .join('; ');
      
      // Prepare alert check input
      const currentSentiment = {
        positive: results.filter(r => r.sentiment === 'positive').length,
        neutral: results.filter(r => r.sentiment === 'neutral').length,
        negative: results.filter(r => r.sentiment === 'negative').length,
      };
      
      const alerts = checkAlerts(alertConfigs as AlertConfig[], {
        brandId,
        userId,
        currentScore: insights.overallVisibilityScore,
        previousScore: previousData?.visibility_score || null,
        currentSOV: Object.fromEntries(sovData.competitorSOV.map(c => [c.brandName, c.percentage])),
        previousSOV: previousData?.competitor_sov || null,
        currentSentiment,
        previousSentiment: null, // Would need to store this in history
        hasNewCitation: false, // Would need to track new citations
        hasHallucination,
        hallucinationDetails,
      });
      
      // Store triggered alerts
      if (alerts.length > 0) {
        await getSupabaseAdmin().from('alerts').insert(
          alerts.map(alert => ({
            user_id: userId,
            brand_id: brandId,
            ...alert,
            sent_via: ['in_app'],
          }))
        );
      }
    });

    // Step 6: Store insights as individual records
    await step.run('store-insights', async () => {
      // Create individual insight records for strengths, weaknesses, and recommendations
      const insightRecords: Array<{
        scan_id: string;
        brand_id: string;
        insight_type: string;
        priority: string;
        title: string;
        description: string;
        action_items: string[];
      }> = [];

      // Add strengths as insights
      (insights.strengths || []).forEach((strength: string, index: number) => {
        insightRecords.push({
          scan_id: scanId,
          brand_id: brandId,
          insight_type: 'strength',
          priority: index === 0 ? 'high' : 'medium',
          title: `Strength: ${strength.substring(0, 100)}`,
          description: strength,
          action_items: ['Leverage this strength in marketing', 'Maintain current approach'],
        });
      });

      // Add weaknesses as threats (DB constraint: 'improvement', 'strength', 'opportunity', 'threat')
      (insights.weaknesses || []).forEach((weakness: string, index: number) => {
        insightRecords.push({
          scan_id: scanId,
          brand_id: brandId,
          insight_type: 'threat',
          priority: index === 0 ? 'high' : 'medium',
          title: `Threat: ${weakness.substring(0, 100)}`,
          description: weakness,
          action_items: ['Address this threat', 'Develop mitigation plan'],
        });
      });

      // Add recommendations as opportunities (DB constraint: 'improvement', 'strength', 'opportunity', 'threat')
      (insights.recommendations || []).forEach((recommendation: string, index: number) => {
        insightRecords.push({
          scan_id: scanId,
          brand_id: brandId,
          insight_type: 'opportunity',
          priority: index === 0 ? 'high' : index < 3 ? 'medium' : 'low',
          title: `Opportunity: ${recommendation.substring(0, 100)}`,
          description: recommendation,
          action_items: [recommendation],
        });
      });

      // Insert all insights in parallel
      if (insightRecords.length > 0) {
        await getSupabaseAdmin().from('insights').insert(insightRecords);
      }
    });

    // Step 7: Update scan status to completed with visibility scores
    await step.run('update-scan-status-completed', async () => {
      // Calculate AI visibility score (LLM providers)
      // Calculate SEO visibility score (search providers)
      const llmProviders = ['gemini', 'openai', 'claude', 'grok'];
      const searchProviders = ['perplexity', 'google'];

      let aiScore = 0;
      let aiCount = 0;
      let seoScore = 0;
      let seoCount = 0;

      for (const result of results as BrandDetectionResult[]) {
        const score = result.brandMentioned ? 100 : 0;
        if (llmProviders.includes(result.provider)) {
          aiScore += score;
          aiCount++;
        } else if (searchProviders.includes(result.provider)) {
          seoScore += score;
          seoCount++;
        }
      }

      const aiVisibilityScore = aiCount > 0 ? Math.round(aiScore / aiCount) : 0;
      const seoVisibilityScore = seoCount > 0 ? Math.round(seoScore / seoCount) : 0;
      const mentionsCount = (results as BrandDetectionResult[]).filter(r => r.brandMentioned).length;

      await getSupabaseAdmin()
        .from('scans')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          visibility_score: insights.overallVisibilityScore,
          ai_visibility_score: aiVisibilityScore,
          seo_visibility_score: seoVisibilityScore,
          mentions_count: mentionsCount,
          total_providers: providers.length,
        })
        .eq('id', scanId);
    });

    // Step 8: Send completion event
    await step.sendEvent('scan-completed', {
      name: 'scan/brand.completed',
      data: {
        scanId,
        brandId,
        userId,
        overallScore: insights.overallVisibilityScore,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      success: true,
      scanId,
      overallScore: insights.overallVisibilityScore,
      providersProcessed: providers.length,
    };
  }
);

/**
 * Legacy Brand Scan Function (for scheduled scans)
 * Triggered when a brand scan is requested via scheduled job
 */
export const brandScanFunction = inngest.createFunction(
  {
    id: 'brand-scan',
    name: 'Brand Visibility Scan',
    retries: 3,
  },
  { event: 'brand/scan.requested' },
  async ({ event, step }) => {
    const { brandId, brandName, keywords, userId, scanType } = event.data;

    // Get full brand info
    const brand = await step.run('get-brand-info', async () => {
      const { data, error } = await getSupabaseAdmin()
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single();

      if (error) throw new Error(`Brand not found: ${brandId}`);
      return data;
    });

    // Create a scan record
    const scan = await step.run('create-scan-record', async () => {
      const defaultProviders: ProviderType[] = ['gemini', 'openai', 'anthropic', 'perplexity'];
      const { data, error } = await getSupabaseAdmin()
        .from('scans')
        .insert({
          brand_id: brandId,
          user_id: userId,
          status: 'pending',
          providers: defaultProviders,
          total_queries: defaultProviders.length,
          completed_queries: 0,
          credits_used: 0, // Scheduled scans don't use credits
        })
        .select()
        .single();

      if (error) throw new Error(`Failed to create scan: ${error.message}`);
      return data;
    });

    // Create default query
    const defaultQuery = keywords.length > 0
      ? `${brandName} ${keywords[0]} 추천해주세요`
      : `${brandName} 추천해주세요`;

    await step.run('create-scan-query', async () => {
      await getSupabaseAdmin().from('scan_queries').insert({
        scan_id: scan.id,
        query_text: defaultQuery,
        query_type: 'recommendation',
      });
    });

    // Trigger the main scan processing
    await step.sendEvent('trigger-scan-processing', {
      name: 'scan/brand.requested',
      data: {
        scanId: scan.id,
        brandId,
        userId,
        query: defaultQuery,
        providers: scan.providers as ProviderType[],
      },
    });

    return {
      success: true,
      scanId: scan.id,
      scanType,
    };
  }
);

/**
 * Scheduled Daily Scan
 * Runs at 6 AM KST every day
 */
export const scheduledDailyScanFunction = inngest.createFunction(
  {
    id: 'scheduled-daily-scan',
    name: 'Scheduled Daily Brand Scan',
  },
  { cron: 'TZ=Asia/Seoul 0 6 * * *' },
  async ({ step }) => {
    // Fetch all active brands with active subscriptions
    const brands = await step.run('fetch-active-brands', async () => {
      const { data, error } = await getSupabaseAdmin()
        .from('brands')
        .select(`
          id,
          name,
          keywords,
          user_id,
          users!inner (
            subscription_tier
          )
        `)
        .eq('is_primary', true);

      if (error) {
        console.error('Failed to fetch brands:', error);
        return [];
      }

      // Filter to users with Pro tier (daily scans)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data || []).filter((brand: any) => {
        const user = Array.isArray(brand.users) ? brand.users[0] : brand.users;
        return user?.subscription_tier === 'pro';
      }).map((brand: { id: string; name: string; keywords: string[]; user_id: string }) => ({
        id: brand.id,
        name: brand.name,
        keywords: brand.keywords || [],
        userId: brand.user_id,
      }));
    });

    // Trigger scans for each brand
    if (brands.length > 0) {
      await step.sendEvent(
        'trigger-brand-scans',
        brands.map((brand) => ({
          name: 'brand/scan.requested' as const,
          data: {
            brandId: brand.id,
            brandName: brand.name,
            keywords: brand.keywords,
            userId: brand.userId,
            scanType: 'scheduled' as const,
          },
        }))
      );
    }

    return {
      success: true,
      brandsScanned: brands.length,
      triggeredAt: new Date().toISOString(),
    };
  }
);
