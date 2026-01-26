import { vi, afterEach } from 'vitest';

// Mock environment variables
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');
vi.stubEnv('OPENAI_API_KEY', 'test-openai-key');
vi.stubEnv('ANTHROPIC_API_KEY', 'test-anthropic-key');
vi.stubEnv('GOOGLE_AI_API_KEY', 'test-google-ai-key');
vi.stubEnv('XAI_API_KEY', 'test-xai-key');
vi.stubEnv('PERPLEXITY_API_KEY', 'test-perplexity-key');
vi.stubEnv('NODE_ENV', 'test');

// Mock fetch for API tests
global.fetch = vi.fn();

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});
