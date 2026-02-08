---
paths:
  - "src/services/llm/**"
---

# LLM Provider Rules

- All providers extend `BaseLLMProvider` abstract class
- Providers: OpenAI, Gemini, Claude, Grok, Perplexity
- Each provider handles: retry logic, timeout (AbortController), error categorization
- Scans query multiple providers in parallel via `Promise.allSettled()`
- Credit costs per provider defined in `src/lib/config.ts`
- Provider API keys are optional (validated in `src/lib/env.ts`)
- Use latest models: gemini-3-flash-preview, gpt-4o, claude-sonnet-4-20250514
