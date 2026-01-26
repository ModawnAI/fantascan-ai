import type { LLMProvider, LLMProviderClient } from './types';
import {
  OpenAIProvider,
  GeminiProvider,
  ClaudeProvider,
  GrokProvider,
  PerplexityProvider,
} from './providers';

export * from './types';
export * from './providers';

/**
 * Create an LLM provider client
 */
export function createLLMClient(
  provider: LLMProvider,
  apiKey?: string
): LLMProviderClient {
  switch (provider) {
    case 'openai':
      return new OpenAIProvider(apiKey);
    case 'gemini':
      return new GeminiProvider(apiKey);
    case 'claude':
      return new ClaudeProvider(apiKey);
    case 'grok':
      return new GrokProvider(apiKey);
    case 'perplexity':
      return new PerplexityProvider(apiKey);
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}

// Lazy-initialized default client to avoid build-time API key requirement
let _defaultLLMClient: OpenAIProvider | null = null;

/**
 * Get the default LLM client (lazy initialization)
 */
export function getDefaultLLMClient(): LLMProviderClient {
  if (!_defaultLLMClient) {
    _defaultLLMClient = new OpenAIProvider();
  }
  return _defaultLLMClient;
}
