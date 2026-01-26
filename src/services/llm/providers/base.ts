// Base LLM provider with retry and timeout handling

import { config } from '@/lib/config';
import { withRetry, llmRetryOptions } from '@/lib/retry';
import { ProviderError, ProviderTimeoutError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type {
  LLMProviderClient,
  LLMMessage,
  LLMCompletionOptions,
  LLMCompletionResponse,
  LLMProvider,
} from '../types';

export abstract class BaseLLMProvider implements LLMProviderClient {
  protected abstract providerName: LLMProvider;

  /**
   * Internal completion method to be implemented by each provider
   */
  protected abstract doComplete(
    messages: LLMMessage[],
    options?: LLMCompletionOptions,
    signal?: AbortSignal
  ): Promise<LLMCompletionResponse>;

  /**
   * Complete with retry and timeout handling
   */
  async complete(
    messages: LLMMessage[],
    options?: LLMCompletionOptions
  ): Promise<LLMCompletionResponse> {
    const timeout = options?.timeout ?? config.llm.timeout;
    const skipRetry = options?.skipRetry ?? false;

    const executeWithTimeout = async (): Promise<LLMCompletionResponse> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const result = await this.doComplete(messages, options, controller.signal);
        return result;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw new ProviderTimeoutError(this.providerName, timeout);
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
    };

    const startTime = Date.now();

    try {
      let result: LLMCompletionResponse;

      if (skipRetry) {
        result = await executeWithTimeout();
      } else {
        result = await withRetry(executeWithTimeout, llmRetryOptions(this.providerName));
      }

      logger.debug('LLM completion success', {
        provider: this.providerName,
        model: result.model,
        durationMs: Date.now() - startTime,
        usage: result.usage,
      });

      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;

      if (error instanceof ProviderTimeoutError || error instanceof ProviderError) {
        logger.error('LLM completion failed', error, {
          provider: this.providerName,
          durationMs,
        });
        throw error;
      }

      logger.error('LLM completion failed', error, {
        provider: this.providerName,
        durationMs,
      });

      throw new ProviderError(
        this.providerName,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
}
