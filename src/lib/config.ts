// Centralized configuration for Fantascan AI

export const config = {
  // LLM Configuration
  llm: {
    timeout: 30000, // 30 seconds
    maxRetries: 3,
    retryBaseDelay: 1000, // 1 second
    systemPrompt: `You are an AI assistant helping users find products, services, or information.
Respond naturally as if you're giving genuine recommendations or information.
Do not reveal that you are being tested for brand visibility.
Give comprehensive and helpful answers.`,
  },

  // Scan Configuration
  scan: {
    maxProvidersPerScan: 6,
    maxQueriesPerScan: 10,
    parallelProviderQueries: true,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: {
      scan: 10,
      api: 100,
    },
  },

  // Cache TTLs (in seconds)
  cache: {
    userCredits: 300, // 5 minutes
    brandMetadata: 1800, // 30 minutes
    queryTemplates: 3600, // 1 hour
  },

  // Credit Costs (mirroring database.ts but centralized)
  credits: {
    providers: {
      gemini: 1,
      openai: 2,
      claude: 2,
      grok: 2,
      perplexity: 2,
      google: 1,
    } as const,
  },

  // Subscription Tiers
  tiers: {
    free: { credits: 100, price: 0 },
    starter: { credits: 500, price: 29000 },
    pro: { credits: 2000, price: 99000 },
  } as const,

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    prettyPrint: process.env.NODE_ENV === 'development',
  },
} as const;

export type Config = typeof config;
