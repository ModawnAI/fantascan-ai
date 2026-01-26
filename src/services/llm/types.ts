export type LLMProvider = 'openai' | 'gemini' | 'claude' | 'grok' | 'perplexity';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  timeout?: number; // Request timeout in ms
  skipRetry?: boolean; // Skip retry logic for this request
}

export interface LLMCompletionResponse {
  content: string;
  provider: LLMProvider;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMProviderClient {
  complete(
    messages: LLMMessage[],
    options?: LLMCompletionOptions
  ): Promise<LLMCompletionResponse>;
}
