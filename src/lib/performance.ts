/**
 * Performance Monitoring Utilities
 *
 * Provides instrumentation for tracking custom performance metrics
 * and creating spans for specific operations.
 */

import * as Sentry from '@sentry/nextjs';

/**
 * Performance metrics configuration
 */
export const PERFORMANCE_THRESHOLDS = {
  // LLM query thresholds
  llmQueryWarning: 5000, // 5 seconds
  llmQueryCritical: 15000, // 15 seconds

  // Database query thresholds
  dbQueryWarning: 500, // 500ms
  dbQueryCritical: 2000, // 2 seconds

  // API response thresholds
  apiResponseWarning: 1000, // 1 second
  apiResponseCritical: 5000, // 5 seconds

  // Brand detection thresholds
  brandDetectionWarning: 10000, // 10 seconds
  brandDetectionCritical: 30000, // 30 seconds
} as const;

/**
 * Operation types for categorizing metrics
 */
export type OperationType =
  | 'llm.query'
  | 'llm.provider.openai'
  | 'llm.provider.gemini'
  | 'llm.provider.anthropic'
  | 'llm.provider.grok'
  | 'llm.provider.perplexity'
  | 'db.query'
  | 'db.insert'
  | 'db.update'
  | 'db.delete'
  | 'api.request'
  | 'brand.detection'
  | 'brand.analysis'
  | 'auth.verification'
  | 'cache.lookup'
  | 'cache.set';

/**
 * Create a new performance span for an operation
 */
export function startSpan<T>(
  operation: OperationType,
  name: string,
  fn: () => T | Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  return Sentry.startSpan(
    {
      name,
      op: operation,
      attributes,
    },
    async (span) => {
      const startTime = performance.now();

      try {
        const result = await fn();
        const duration = performance.now() - startTime;

        // Add duration as attribute
        span.setAttribute('duration_ms', duration);

        // Check thresholds and add warning tags
        addThresholdWarnings(span, operation, duration);

        return result;
      } catch (error) {
        span.setStatus({ code: 2, message: 'error' });
        throw error;
      }
    }
  );
}

/**
 * Track a simple metric without creating a span
 */
export function trackMetric(
  name: string,
  value: number,
  _unit: 'millisecond' | 'second' | 'byte' | 'count' = 'count',
  attributes?: Record<string, string>
): void {
  Sentry.metrics.distribution(name, value, {
    attributes,
  });
}

/**
 * Track a counter metric
 */
export function incrementCounter(
  name: string,
  value: number = 1,
  attributes?: Record<string, string>
): void {
  Sentry.metrics.count(name, value, { attributes });
}

/**
 * Track a gauge metric (current value at a point in time)
 */
export function setGauge(
  name: string,
  value: number,
  _unit: 'millisecond' | 'second' | 'byte' | 'count' = 'count',
  attributes?: Record<string, string>
): void {
  Sentry.metrics.gauge(name, value, { attributes });
}

/**
 * Measure the execution time of a function
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  attributes?: Record<string, string>
): Promise<{ result: T; durationMs: number }> {
  const startTime = performance.now();

  try {
    const result = await fn();
    const durationMs = performance.now() - startTime;

    trackMetric(`${name}.duration`, durationMs, 'millisecond', {
      ...attributes,
      status: 'success',
    });

    return { result, durationMs };
  } catch (error) {
    const durationMs = performance.now() - startTime;

    trackMetric(`${name}.duration`, durationMs, 'millisecond', {
      ...attributes,
      status: 'error',
    });

    throw error;
  }
}

/**
 * Create a timer that can be manually started and stopped
 */
export function createTimer(name: string, defaultAttributes?: Record<string, string>) {
  let startTime: number | null = null;

  return {
    start() {
      startTime = performance.now();
    },
    stop(additionalAttributes?: Record<string, string>) {
      if (startTime === null) {
        console.warn(`Timer ${name} was stopped without being started`);
        return 0;
      }

      const durationMs = performance.now() - startTime;
      trackMetric(`${name}.duration`, durationMs, 'millisecond', {
        ...defaultAttributes,
        ...additionalAttributes,
      });

      startTime = null;
      return durationMs;
    },
    isRunning() {
      return startTime !== null;
    },
  };
}

/**
 * Add threshold warning attributes to a span
 */
function addThresholdWarnings(
  span: Sentry.Span,
  operation: OperationType,
  durationMs: number
): void {
  let warningThreshold: number | undefined;
  let criticalThreshold: number | undefined;

  if (operation.startsWith('llm.')) {
    warningThreshold = PERFORMANCE_THRESHOLDS.llmQueryWarning;
    criticalThreshold = PERFORMANCE_THRESHOLDS.llmQueryCritical;
  } else if (operation.startsWith('db.')) {
    warningThreshold = PERFORMANCE_THRESHOLDS.dbQueryWarning;
    criticalThreshold = PERFORMANCE_THRESHOLDS.dbQueryCritical;
  } else if (operation === 'api.request') {
    warningThreshold = PERFORMANCE_THRESHOLDS.apiResponseWarning;
    criticalThreshold = PERFORMANCE_THRESHOLDS.apiResponseCritical;
  } else if (operation.startsWith('brand.')) {
    warningThreshold = PERFORMANCE_THRESHOLDS.brandDetectionWarning;
    criticalThreshold = PERFORMANCE_THRESHOLDS.brandDetectionCritical;
  }

  if (criticalThreshold && durationMs >= criticalThreshold) {
    span.setAttribute('performance.severity', 'critical');
  } else if (warningThreshold && durationMs >= warningThreshold) {
    span.setAttribute('performance.severity', 'warning');
  }
}

/**
 * Report Web Vitals metrics
 */
export function reportWebVitals(metric: {
  id: string;
  name: string;
  value: number;
  label: 'web-vital' | 'custom';
}): void {
  const { name, value } = metric;

  // Track as Sentry metric
  trackMetric(`web_vitals.${name}`, value, 'millisecond', {
    vital_name: name,
  });

  // Also send as custom performance entry
  Sentry.setMeasurement(name, value, 'millisecond');
}

/**
 * Track LLM provider performance
 */
export function trackLLMPerformance(
  provider: string,
  model: string,
  durationMs: number,
  tokenCount?: number,
  success: boolean = true
): void {
  const tags = {
    provider,
    model,
    status: success ? 'success' : 'error',
  };

  trackMetric('llm.request.duration', durationMs, 'millisecond', tags);

  if (tokenCount) {
    trackMetric('llm.request.tokens', tokenCount, 'count', tags);

    // Calculate tokens per second
    const tokensPerSecond = tokenCount / (durationMs / 1000);
    trackMetric('llm.request.tokens_per_second', tokensPerSecond, 'count', tags);
  }

  incrementCounter('llm.request.count', 1, tags);
}

/**
 * Track brand detection scan performance
 */
export function trackScanPerformance(
  brandName: string,
  providersUsed: number,
  durationMs: number,
  success: boolean = true
): void {
  const tags = {
    status: success ? 'success' : 'error',
  };

  trackMetric('scan.duration', durationMs, 'millisecond', tags);
  trackMetric('scan.providers_used', providersUsed, 'count', tags);
  incrementCounter('scan.count', 1, tags);

  // Track slow scans
  if (durationMs >= PERFORMANCE_THRESHOLDS.brandDetectionWarning) {
    incrementCounter('scan.slow_count', 1, {
      ...tags,
      severity: durationMs >= PERFORMANCE_THRESHOLDS.brandDetectionCritical ? 'critical' : 'warning',
    });
  }
}
