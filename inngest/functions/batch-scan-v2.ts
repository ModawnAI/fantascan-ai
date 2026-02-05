/**
 * Batch Scan V2 Functions
 * 질문 세트 기반 배치 스캔 처리
 */

import { inngest } from '../client';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { queryProvider, analyzeBrandMention } from '@/services/brand-detection';
import type { BatchProvider, SentimentType, BatchScanStatus, PauseReason } from '@/types/batch-scan';

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

// ============================================
// Types
// ============================================

interface BatchScanData {
  id: string;
  user_id: string;
  brand_id: string;
  status: BatchScanStatus;
  settings_snapshot: {
    gemini_iterations: number;
    openai_iterations: number;
    timeout_per_call_ms: number;
    brand_name: string;
    brand_keywords: string[];
    brand_competitors: string[];
  };
}

interface BatchQuestionData {
  id: string;
  question_text: string;
  question_order: number;
  status: string;
  gemini_completed: number;
  gemini_total: number;
  openai_completed: number;
  openai_total: number;
  retry_count: number;
}

// ============================================
// Start Function
// ============================================

export const batchScanV2StartFunction = inngest.createFunction(
  {
    id: 'batch-scan-v2-start',
    name: 'Batch Scan V2 Start',
    retries: 2,
    concurrency: {
      limit: 3,
      key: 'event.data.userId',
    },
  },
  { event: 'batch-scan/v2.start' },
  async ({ event, step }) => {
    const { batchScanId, userId } = event.data;
    const supabase = getSupabaseAdmin();

    // Step 1: Load batch scan data
    const batchScan = await step.run('load-batch-scan', async () => {
      const { data, error } = await supabase
        .from('batch_scans_v2')
        .select('*')
        .eq('id', batchScanId)
        .single();

      if (error || !data) {
        throw new Error(`Batch scan not found: ${batchScanId}`);
      }

      return data as BatchScanData;
    });

    // Step 2: Update status to running
    await step.run('set-running', async () => {
      await supabase
        .from('batch_scans_v2')
        .update({
          status: 'running' as BatchScanStatus,
          started_at: new Date().toISOString(),
        })
        .eq('id', batchScanId);
    });

    // Step 3: Load questions
    const questions = await step.run('load-questions', async () => {
      const { data, error } = await supabase
        .from('batch_scan_questions')
        .select('*')
        .eq('batch_scan_id', batchScanId)
        .order('question_order', { ascending: true });

      if (error) {
        throw new Error(`Failed to load questions: ${error.message}`);
      }

      return data as BatchQuestionData[];
    });

    // Step 4: Process each question
    for (const question of questions) {
      // Skip completed questions
      if (question.status === 'completed') continue;

      // Check if paused
      const isPaused = await step.run(`check-pause-${question.id}`, async () => {
        const { data } = await supabase
          .from('batch_scans_v2')
          .select('status')
          .eq('id', batchScanId)
          .single();

        return data?.status === 'paused';
      });

      if (isPaused) {
        return { status: 'paused', lastQuestionId: question.id };
      }

      // Process question
      await step.run(`process-question-${question.id}`, async () => {
        await processQuestion(
          supabase,
          batchScanId,
          question,
          batchScan.settings_snapshot
        );
      });
    }

    // Step 5: Finalize
    const result = await step.run('finalize', async () => {
      return await finalizeBatchScan(supabase, batchScanId);
    });

    // Step 6: Send completion event
    await step.sendEvent('batch-scan-completed', {
      name: 'batch-scan/v2.completed',
      data: {
        batchScanId,
        userId,
        overallExposureRate: result.overallExposureRate,
        totalQuestions: questions.length,
        timestamp: new Date().toISOString(),
      },
    });

    return { status: 'completed', batchScanId, ...result };
  }
);

// ============================================
// Resume Function
// ============================================

export const batchScanV2ResumeFunction = inngest.createFunction(
  {
    id: 'batch-scan-v2-resume',
    name: 'Batch Scan V2 Resume',
    retries: 2,
  },
  { event: 'batch-scan/v2.resume' },
  async ({ event, step }) => {
    const { batchScanId, userId } = event.data;
    const supabase = getSupabaseAdmin();

    // Update status
    await step.run('resume-scan', async () => {
      await supabase
        .from('batch_scans_v2')
        .update({
          status: 'running' as BatchScanStatus,
          pause_reason: null,
          resumed_at: new Date().toISOString(),
        })
        .eq('id', batchScanId);
    });

    // Trigger start function (which will continue from where it left off)
    await step.sendEvent('trigger-resume', {
      name: 'batch-scan/v2.start',
      data: { batchScanId, userId },
    });

    return { status: 'resumed' };
  }
);

// ============================================
// Helper Functions
// ============================================

async function processQuestion(
  supabase: SupabaseClient,
  batchScanId: string,
  question: BatchQuestionData,
  settings: BatchScanData['settings_snapshot']
): Promise<void> {
  // Update question status to running
  await supabase
    .from('batch_scan_questions')
    .update({
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .eq('id', question.id);

  const providers: BatchProvider[] = ['gemini', 'openai'];

  // Process each provider
  for (const provider of providers) {
    const total = provider === 'gemini' ? question.gemini_total : question.openai_total;
    const completed = provider === 'gemini' ? question.gemini_completed : question.openai_completed;

    for (let i = completed; i < total; i++) {
      // Check for pause every 10 iterations
      if (i % 10 === 0 && i > completed) {
        const { data: scanStatus } = await supabase
          .from('batch_scans_v2')
          .select('status')
          .eq('id', batchScanId)
          .single();

        if (scanStatus?.status === 'paused') {
          return; // Exit early if paused
        }
      }

      try {
        const result = await queryProviderWithAnalysis(
          provider,
          question.question_text,
          settings,
          settings.timeout_per_call_ms
        );

        // Save iteration result
        await supabase.from('batch_scan_iterations').insert({
          batch_scan_question_id: question.id,
          provider,
          iteration_index: i,
          status: 'success',
          response_text: result.responseText,
          brand_mentioned: result.brandMentioned,
          mention_position: result.mentionPosition,
          sentiment: result.sentiment,
          competitors_mentioned: result.competitorsMentioned,
          response_time_ms: result.responseTimeMs,
        });

        // Update question progress
        const updateField = provider === 'gemini' ? 'gemini_completed' : 'openai_completed';
        const mentionField = provider === 'gemini' ? 'gemini_mention_count' : 'openai_mention_count';
        
        await supabase.rpc('increment_field', {
          table_name: 'batch_scan_questions',
          field_name: updateField,
          row_id: question.id,
        });

        if (result.brandMentioned) {
          await supabase.rpc('increment_field', {
            table_name: 'batch_scan_questions',
            field_name: mentionField,
            row_id: question.id,
          });

          // Update sentiment counts
          if (result.sentiment) {
            const sentimentField = `sentiment_${result.sentiment}`;
            await supabase.rpc('increment_field', {
              table_name: 'batch_scan_questions',
              field_name: sentimentField,
              row_id: question.id,
            });
          }
        }

        // Update batch scan progress
        await supabase.rpc('increment_field', {
          table_name: 'batch_scans_v2',
          field_name: 'completed_iterations',
          row_id: batchScanId,
        });

        // Deduct credit
        const creditCost = provider === 'gemini' ? 1 : 2;
        await supabase.rpc('increment_field', {
          table_name: 'batch_scans_v2',
          field_name: 'used_credits',
          row_id: batchScanId,
          amount: creditCost,
        });

      } catch (error) {
        // Save error iteration
        await supabase.from('batch_scan_iterations').insert({
          batch_scan_question_id: question.id,
          provider,
          iteration_index: i,
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        });

        // Update retry count
        await supabase
          .from('batch_scan_questions')
          .update({
            last_error: error instanceof Error ? error.message : 'Unknown error',
            retry_count: question.retry_count + 1,
          })
          .eq('id', question.id);

        // Continue to next iteration (don't fail the whole question)
      }
    }
  }

  // Finalize question
  await finalizeQuestion(supabase, question.id);
}

async function queryProviderWithAnalysis(
  provider: BatchProvider,
  query: string,
  settings: BatchScanData['settings_snapshot'],
  timeoutMs: number
): Promise<{
  responseText: string;
  brandMentioned: boolean;
  mentionPosition: number | null;
  sentiment: SentimentType | null;
  competitorsMentioned: Record<string, boolean>;
  responseTimeMs: number;
}> {
  const startTime = Date.now();
  
  // Map BatchProvider to ProviderType
  const providerType = provider as 'gemini' | 'openai';
  
  const { responseText, error, durationMs } = await queryProvider(providerType, query);

  if (error || !responseText) {
    throw new Error(error || 'No response from provider');
  }

  // Analyze brand mention
  const analysis = await analyzeBrandMention(responseText, {
    brandName: settings.brand_name,
    brandDescription: '',
    keywords: settings.brand_keywords,
    competitors: settings.brand_competitors,
    query,
  });

  // Check competitor mentions
  const competitorsMentioned: Record<string, boolean> = {};
  for (const competitor of settings.brand_competitors) {
    competitorsMentioned[competitor] = responseText
      .toLowerCase()
      .includes(competitor.toLowerCase());
  }

  return {
    responseText,
    brandMentioned: analysis.brandMentioned,
    mentionPosition: analysis.mentionPosition || null,
    sentiment: analysis.sentiment as SentimentType | null,
    competitorsMentioned,
    responseTimeMs: durationMs || Date.now() - startTime,
  };
}

async function finalizeQuestion(
  supabase: SupabaseClient,
  questionId: string
): Promise<void> {
  // Get question data
  const { data: question } = await supabase
    .from('batch_scan_questions')
    .select('*')
    .eq('id', questionId)
    .single();

  if (!question) return;

  // Calculate exposure rates
  const geminiRate = question.gemini_total > 0
    ? (question.gemini_mention_count / question.gemini_total) * 100
    : 0;
  const openaiRate = question.openai_total > 0
    ? (question.openai_mention_count / question.openai_total) * 100
    : 0;
  const avgRate = (geminiRate + openaiRate) / 2;

  // Update question
  await supabase
    .from('batch_scan_questions')
    .update({
      status: 'completed',
      gemini_exposure_rate: geminiRate,
      openai_exposure_rate: openaiRate,
      avg_exposure_rate: avgRate,
      completed_at: new Date().toISOString(),
    })
    .eq('id', questionId);

  // Update batch scan completed questions count
  await supabase.rpc('increment_field', {
    table_name: 'batch_scans_v2',
    field_name: 'completed_questions',
    row_id: question.batch_scan_id,
  });
}

async function finalizeBatchScan(
  supabase: SupabaseClient,
  batchScanId: string
): Promise<{ overallExposureRate: number }> {
  // Get all questions
  const { data: questions } = await supabase
    .from('batch_scan_questions')
    .select('avg_exposure_rate')
    .eq('batch_scan_id', batchScanId);

  // Calculate overall exposure rate
  let overallExposureRate = 0;
  if (questions && questions.length > 0) {
    const validRates = questions
      .map((q) => q.avg_exposure_rate)
      .filter((r): r is number => r !== null);

    if (validRates.length > 0) {
      overallExposureRate =
        validRates.reduce((a, b) => a + b, 0) / validRates.length;
    }
  }

  // Update batch scan
  await supabase
    .from('batch_scans_v2')
    .update({
      status: 'completed' as BatchScanStatus,
      overall_exposure_rate: overallExposureRate,
      completed_at: new Date().toISOString(),
    })
    .eq('id', batchScanId);

  return { overallExposureRate };
}
