import OpenAI from 'openai';
import { BaseLLMProvider } from './base';
import type {
  LLMMessage,
  LLMCompletionOptions,
  LLMCompletionResponse,
  LLMProvider,
} from '../types';

const DEFAULT_MODEL = 'gpt-4o';

export class OpenAIProvider extends BaseLLMProvider {
  protected providerName: LLMProvider = 'openai';
  private client: OpenAI;

  constructor(apiKey?: string) {
    super();
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
  }

  protected async doComplete(
    messages: LLMMessage[],
    options?: LLMCompletionOptions,
    signal?: AbortSignal
  ): Promise<LLMCompletionResponse> {
    const response = await this.client.chat.completions.create(
      {
        model: options?.model || DEFAULT_MODEL,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens,
        top_p: options?.topP,
      },
      { signal }
    );

    const choice = response.choices[0];

    return {
      content: choice.message.content || '',
      provider: 'openai',
      model: response.model,
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
    };
  }
}
