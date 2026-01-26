import { GoogleGenAI } from '@google/genai';
import { BaseLLMProvider } from './base';
import type {
  LLMMessage,
  LLMCompletionOptions,
  LLMCompletionResponse,
  LLMProvider,
} from '../types';

const DEFAULT_MODEL = 'gemini-3-flash-preview';

export class GeminiProvider extends BaseLLMProvider {
  protected providerName: LLMProvider = 'gemini';
  private client: GoogleGenAI;

  constructor(apiKey?: string) {
    super();
    this.client = new GoogleGenAI({
      apiKey: apiKey || process.env.GEMINI_API_KEY || '',
    });
  }

  protected async doComplete(
    messages: LLMMessage[],
    options?: LLMCompletionOptions,
    signal?: AbortSignal
  ): Promise<LLMCompletionResponse> {
    const model = options?.model || DEFAULT_MODEL;

    // Extract system message and build contents
    const systemMessage = messages.find((m) => m.role === 'system');
    const chatMessages = messages.filter((m) => m.role !== 'system');

    // Convert messages to Gemini format
    const contents = chatMessages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    // Build config
    const config: Record<string, unknown> = {
      thinkingConfig: {
        thinkingLevel: 'MEDIUM',
      },
    };

    // Add system instruction if present
    if (systemMessage) {
      config.systemInstruction = {
        parts: [{ text: systemMessage.content }],
      };
    }

    // Add generation config
    if (options?.temperature !== undefined) {
      config.temperature = options.temperature;
    }
    if (options?.maxTokens !== undefined) {
      config.maxOutputTokens = options.maxTokens;
    }
    if (options?.topP !== undefined) {
      config.topP = options.topP;
    }

    // Generate content
    const generatePromise = this.client.models.generateContent({
      model,
      config,
      contents,
    });

    if (signal) {
      const abortPromise = new Promise<never>((_, reject) => {
        signal.addEventListener('abort', () => {
          reject(new Error('AbortError'));
        });
      });

      const response = await Promise.race([generatePromise, abortPromise]);

      return {
        content: response.text || '',
        provider: 'gemini',
        model,
        usage: response.usageMetadata
          ? {
              promptTokens: response.usageMetadata.promptTokenCount || 0,
              completionTokens: response.usageMetadata.candidatesTokenCount || 0,
              totalTokens: response.usageMetadata.totalTokenCount || 0,
            }
          : undefined,
      };
    }

    const response = await generatePromise;

    return {
      content: response.text || '',
      provider: 'gemini',
      model,
      usage: response.usageMetadata
        ? {
            promptTokens: response.usageMetadata.promptTokenCount || 0,
            completionTokens: response.usageMetadata.candidatesTokenCount || 0,
            totalTokens: response.usageMetadata.totalTokenCount || 0,
          }
        : undefined,
    };
  }
}
