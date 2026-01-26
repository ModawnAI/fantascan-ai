# Fantascan AI - Improvement Roadmap

A comprehensive list of improvements to make the application more robust, secure, and production-ready.

---

## 🔴 Critical (Security & Data Integrity)

### 1. Race Condition on Credit Deduction
**File:** `src/app/api/scans/route.ts:60-75`
**Issue:** Credit check and deduction are not atomic, allowing potential double-spending.
**Fix:** Use Supabase RPC with database transaction or optimistic locking.

```typescript
// Current (vulnerable):
const credits = user.credits - CREDIT_COSTS.scan;
await supabase.from('users').update({ credits }).eq('id', user.id);

// Recommended: Create Supabase RPC function with atomic operation
// supabase/migrations/xxx_atomic_credit_deduction.sql
```

### 2. Input Validation Missing
**Files:** `src/app/api/scans/route.ts`, `src/app/api/brands/route.ts`
**Issue:** No Zod validation on request bodies, vulnerable to malformed data.
**Fix:** Add Zod schemas for all API endpoints.

```typescript
// Add to src/lib/validations/scan.ts
import { z } from 'zod';

export const createScanSchema = z.object({
  brandId: z.string().uuid(),
  queryTemplateIds: z.array(z.string().uuid()).min(1).max(10),
  providers: z.array(z.enum(['openai', 'gemini', 'claude', 'grok', 'perplexity', 'google'])),
});
```

### 3. API Rate Limiting
**Files:** All API routes under `src/app/api/`
**Issue:** No rate limiting, vulnerable to abuse and cost explosion.
**Fix:** Implement rate limiting with Upstash Redis or Vercel Edge Config.

### 4. Hardcoded Supabase Cookie Name
**File:** `src/middleware.ts:12`
**Issue:** `sb-gkebuhyspwnulksvaizw-auth-token` is hardcoded.
**Fix:** Use environment variable `NEXT_PUBLIC_SUPABASE_PROJECT_ID`.

---

## 🟡 Important (Reliability & Performance)

### 5. LLM Provider Retry Logic
**File:** `src/services/llm/providers/*.ts`
**Issue:** No retry mechanism for transient failures (rate limits, timeouts).
**Fix:** Add exponential backoff with configurable retries.

```typescript
// Add to src/lib/retry.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(baseDelay * Math.pow(2, i));
    }
  }
  throw new Error('Max retries exceeded');
}
```

### 6. Parallel Provider Querying
**File:** `inngest/functions/brand-monitoring.ts:180-220`
**Issue:** Providers are queried sequentially, causing slow scan times.
**Fix:** Use `Promise.allSettled()` for parallel execution with graceful degradation.

```typescript
// Current: Sequential
for (const provider of providers) {
  const result = await queryProvider(provider, query);
}

// Recommended: Parallel
const results = await Promise.allSettled(
  providers.map(provider => queryProvider(provider, query))
);
```

### 7. Request Timeout Handling
**Files:** `src/services/llm/providers/*.ts`, `src/services/brand-detection/index.ts`
**Issue:** No timeout configuration, requests can hang indefinitely.
**Fix:** Add AbortController with configurable timeout.

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);
try {
  const response = await fetch(url, { signal: controller.signal });
} finally {
  clearTimeout(timeoutId);
}
```

### 8. Caching Strategy
**Issue:** No caching for expensive operations (LLM calls, repeated queries).
**Fix:** Implement Redis caching for:
- Query template results (TTL: 1 hour)
- User credit balance (TTL: 5 minutes)
- Brand metadata (TTL: 30 minutes)

### 9. Database Query Optimization
**Files:** Various API routes
**Issue:** Multiple round trips for related data.
**Fix:** Use Supabase joins and select specific columns.

```typescript
// Current: Multiple queries
const { data: brand } = await supabase.from('brands').select('*').eq('id', brandId);
const { data: scans } = await supabase.from('scans').select('*').eq('brand_id', brandId);

// Recommended: Single query with join
const { data } = await supabase
  .from('brands')
  .select('id, name, scans(id, status, created_at)')
  .eq('id', brandId)
  .single();
```

---

## 🟢 Recommended (Code Quality & Maintainability)

### 10. Centralized Error Handling
**Issue:** Inconsistent error handling across API routes.
**Fix:** Create error handling middleware and custom error classes.

```typescript
// src/lib/errors.ts
export class AppError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string
  ) {
    super(message);
  }
}

export class InsufficientCreditsError extends AppError {
  constructor() {
    super('INSUFFICIENT_CREDITS', 402, 'Not enough credits');
  }
}
```

### 11. Structured Logging
**Issue:** Console.log used for error logging, no structured format.
**Fix:** Implement structured logging with Pino or Winston.

```typescript
// src/lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
});

// Usage
logger.error({ err, brandId, provider }, 'Provider query failed');
```

### 12. Configuration Management
**File:** Multiple files with hardcoded values
**Issue:** System prompts, timeouts, limits are hardcoded.
**Fix:** Centralize in `src/config/index.ts`.

```typescript
// src/config/index.ts
export const config = {
  llm: {
    timeout: Number(process.env.LLM_TIMEOUT) || 30000,
    maxRetries: Number(process.env.LLM_MAX_RETRIES) || 3,
    systemPrompt: process.env.LLM_SYSTEM_PROMPT || '...',
  },
  scan: {
    maxProvidersPerScan: 6,
    maxQueriesPerScan: 10,
  },
  credits: {
    scan: 10,
    insight: 5,
  },
} as const;
```

### 13. Type Safety Improvements
**File:** `src/types/database.ts`
**Issue:** Manual type definitions can drift from actual schema.
**Fix:** Generate types from Supabase schema.

```bash
npx supabase gen types typescript --project-id gkebuhyspwnulksvaizw > src/types/supabase.ts
```

### 14. Environment Variable Validation
**Issue:** No validation that required env vars are set.
**Fix:** Add startup validation with Zod.

```typescript
// src/lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

export const env = envSchema.parse(process.env);
```

---

## 🧪 Testing

### 15. Unit Tests
**Issue:** No test files found in codebase.
**Priority Files:**
- `src/services/brand-detection/index.ts` - Core business logic
- `src/services/llm/providers/*.ts` - LLM integrations
- `src/lib/utils.ts` - Utility functions

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

### 16. Integration Tests
**Priority:** API routes with database operations.
- `src/app/api/scans/route.ts`
- `src/app/api/brands/route.ts`
- Credit deduction flow

### 17. E2E Tests
**Tool:** Playwright
**Priority Flows:**
- User signup → Create brand → Run scan → View results
- Credit purchase flow
- Scheduled scan execution

---

## 📊 Monitoring & Observability

### 18. Error Tracking
**Fix:** Integrate Sentry for error tracking.

```typescript
// src/lib/sentry.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
});
```

### 19. Performance Monitoring
**Fix:** Add custom metrics for:
- LLM response times per provider
- Scan completion times
- Credit usage patterns
- API latency percentiles

### 20. Health Check Endpoint
**Fix:** Add `/api/health` endpoint.

```typescript
// src/app/api/health/route.ts
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    llmProviders: await checkLLMProviders(),
  };

  const healthy = Object.values(checks).every(Boolean);
  return Response.json(checks, { status: healthy ? 200 : 503 });
}
```

---

## 🎨 UX Improvements

### 21. Loading States
**Issue:** Some actions lack proper loading feedback.
**Fix:** Add skeleton loaders for:
- Scan results page
- Brand dashboard
- Insights section

### 22. Error Boundaries
**Issue:** No error boundaries for graceful degradation.
**Fix:** Add React error boundaries with fallback UI.

### 23. Optimistic Updates
**Issue:** UI waits for server response before updating.
**Fix:** Implement optimistic updates for:
- Scan initiation
- Brand creation
- Settings changes

### 24. Offline Support
**Fix:** Add service worker for:
- Caching static assets
- Queuing failed requests
- Offline indicator

---

## 🚀 DevOps & Infrastructure

### 25. CI/CD Pipeline
**Fix:** Add GitHub Actions workflow.

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test
```

### 26. Database Migrations
**Issue:** No migration tracking visible.
**Fix:** Ensure all schema changes go through `supabase/migrations/`.

### 27. Secrets Management
**Issue:** All secrets in `.env.local`.
**Fix:** Use Vercel environment variables with proper scoping (Production/Preview/Development).

### 28. Backup Strategy
**Fix:** Configure Supabase point-in-time recovery and regular backups.

---

## 📋 Priority Order

1. **Week 1:** Items 1-4 (Critical security issues)
2. **Week 2:** Items 5-9 (Reliability improvements)
3. **Week 3:** Items 10-14 (Code quality)
4. **Week 4:** Items 15-17 (Testing foundation)
5. **Ongoing:** Items 18-28 (Monitoring, UX, DevOps)

---

## Notes

- All changes should be made incrementally with proper testing
- Consider feature flags for gradual rollout of major changes
- Document API changes in OpenAPI/Swagger format
- Review Supabase RLS policies for additional security
