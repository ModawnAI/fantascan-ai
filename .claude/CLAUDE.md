# Claude Code Project Instructions

## Working Conventions
- Always read files before editing
- Prefer editing existing files over creating new ones
- Run `npm run typecheck` to verify TypeScript after changes
- Run `npm run test:run` to verify tests after changes
- Use existing API routes pattern: `src/app/api/<domain>/route.ts`
- Use existing component pattern: `src/components/<domain>/<component>.tsx`
- Use existing hook pattern: `src/hooks/use-<name>.ts`

## Import Patterns
```typescript
// Supabase clients
import { createClient } from '@/lib/supabase/server';    // Server (API routes, RSC)
import { createClient } from '@/lib/supabase/client';    // Browser (Client Components)

// SWR hooks
import { useBrands } from '@/hooks/use-brands';
import { useScans } from '@/hooks/use-scans';

// Types
import type { Brand, Scan, ScanResult } from '@/types';

// UI Components (shadcn/ui)
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// Validations
import { brandSchema, scanSchema } from '@/lib/validations';

// LLM Providers
import { LLMProviderFactory } from '@/services/llm';

// Inngest
import { inngest } from '@inngest/client';
```

## Data Flow
```
Client Component → SWR Hook → API Route → Supabase
                                        → LLM Provider (scans)
Background Jobs: Inngest Event → Inngest Function → Supabase/LLM
```

## Key Conventions
- SWR hooks use optimistic updates with rollback
- All API input validated with Zod schemas in `src/lib/validations/`
- LLM providers extend `BaseLLMProvider` with retry/timeout logic
- Environment variables validated via `src/lib/env.ts` (Zod)
- Centralized config in `src/lib/config.ts` (timeouts, rate limits, credits)
- Error classes in `src/lib/errors.ts` with HTTP status codes
- Sentry captures all unhandled errors
