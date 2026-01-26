import Anthropic from '@anthropic-ai/sdk';
import { BaseLLMProvider } from './base';
import type {
  LLMMessage,
  LLMCompletionOptions,
  LLMCompletionResponse,
  LLMProvider,
} from '../types';

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

export class ClaudeProvider extends BaseLLMProvider {
  protected providerName: LLMProvider = 'claude';
  private client: Anthropic;

  constructor(apiKey?: string) {
    super();
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  protected async doComplete(
    messages: LLMMessage[],
    options?: LLMCompletionOptions,
    signal?: AbortSignal
  ): Promise<LLMCompletionResponse> {
    // Extract system message
    const systemMessage = messages.find((m) => m.role === 'system');
    const chatMessages = messages.filter((m) => m.role !== 'system');

    const response = await this.client.messages.create(
      {
        model: options?.model || DEFAULT_MODEL,
        max_tokens: options?.maxTokens || 4096,
        system: systemMessage?.content,
        messages: chatMessages.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
        temperature: options?.temperature ?? 0.7,
        top_p: options?.topP,
      },
      { signal }
    );

    const textContent = response.content.find((c) => c.type === 'text');

    return {
      content: textContent?.type === 'text' ? textContent.text : '',
      provider: 'claude',
      model: response.model,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  }
}
