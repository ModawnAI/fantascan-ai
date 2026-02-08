# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fantascan AI is a Korean brand visibility monitoring tool for AI platforms (AEO/GEO/SEO). It tracks brand mentions across ChatGPT, Gemini, Claude, Grok, and Perplexity, analyzing visibility scores, citations, sentiment, and competitive positioning.

**Stack:** Next.js 15 (App Router), React 19, TypeScript (strict), Tailwind CSS 4, Supabase (PostgreSQL + Auth), SWR, Inngest (background jobs), Sentry

## Commands

```bash
npm run dev              # Dev server at localhost:3000
npm run build            # Production build
npm run lint             # ESLint
npm run typecheck        # TypeScript check (tsc --noEmit)
npm test                 # Vitest watch mode
npm run test:run         # Vitest single run
npm run test:coverage    # Vitest with coverage
npm run test:e2e         # Playwright E2E tests
npm run test:e2e:headed  # E2E with visible browser
npx inngest-cli@latest dev  # Inngest dev server for background jobs
```

Run a single unit test: `npx vitest run tests/lib/rate-limit.test.ts`
Run a single E2E test: `npx playwright test e2e/auth.spec.ts`

## Architecture

### Path Aliases
- `@/*` maps to `./src/*`
- `@inngest/*` maps to `./inngest/*`

### Data Flow Pattern
Client components use SWR hooks (`src/hooks/`) that call Next.js API routes (`src/app/api/`). API routes authenticate via Supabase JWT cookies, validate input with Zod schemas (`src/lib/validations/`), then query Supabase directly. Background jobs (scans, reports, alerts) run through Inngest functions (`inngest/functions/`).

### Key Architectural Decisions

**Supabase Clients:** Two separate client factories exist:
- `src/lib/supabase/server.ts` - Server-side (API routes, Server Components) - uses `cookies()` from `next/headers`
- `src/lib/supabase/client.ts` - Browser-side (Client Components) - uses `createBrowserClient`
- `src/lib/supabase/middleware.ts` - Session refresh in middleware

**SWR + Optimistic Updates:** All CRUD hooks in `src/hooks/` use SWR's `mutate` with optimistic data for instant UI feedback and automatic rollback on failure. The centralized API endpoint map and cache keys are in `src/lib/swr.ts`.

**LLM Provider System:** `src/services/llm/providers/` has a `BaseLLMProvider` abstract class with retry logic, timeout handling (AbortController), and error categorization. Each provider (OpenAI, Gemini, Claude, Grok, Perplexity) extends it. Scans query multiple providers in parallel via `Promise.allSettled()`.

**Environment Validation:** `src/lib/env.ts` validates all env vars with Zod on first access (lazy). Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OPENAI_API_KEY`. Other provider keys are optional.

**Centralized Config:** `src/lib/config.ts` defines timeouts, rate limits, credit costs, and tier settings. Credit costs per provider: Gemini=1, OpenAI=1, Claude=2, Grok=2, Perplexity=2.

**Auth Middleware:** `src/middleware.ts` protects `/dashboard`, `/onboarding`, `/scan`, `/settings` routes. Redirects unauthenticated users to `/login` and authenticated users away from auth pages.

### Route Groups
- `src/app/(app)/` - Protected app pages (dashboard, scan, settings, analytics)
- `src/app/(auth)/` - Auth pages (login, signup, forgot-password)
- `src/app/api/` - REST API routes

### Background Jobs (Inngest)
`inngest/functions/` contains event-driven functions: daily scans, batch scan processing (V2 with pause/resume), weekly reports, visibility alerts, anomaly detection. Registered via `inngest/index.ts` and served at `/api/inngest`.

### Database
Supabase PostgreSQL with RLS. Migrations in `supabase/migrations/`. Key tables: `users`, `brands`, `scans`, `scan_results`, `batch_scans_v2`, `question_sets`, `visibility_history`, `citations`. The schema uses custom enums and jsonb columns for flexible data.

### UI Components
Built with shadcn/ui (Radix UI primitives) in `src/components/ui/`. Custom components organized by feature: `dashboard/`, `scan/`, `analytics/`, `onboarding/`, `settings/`, `question-sets/`.

### Testing
- Unit tests (`tests/`) use Vitest + jsdom with setup in `tests/setup.ts`
- E2E tests (`e2e/`) use Playwright with auth fixtures in `e2e/fixtures/auth.ts` and global setup in `e2e/global-setup.ts`

### Error Handling
Custom error classes in `src/lib/errors.ts` with HTTP status codes. Sentry integration for client/server/edge via `sentry.*.config.ts` and `src/instrumentation.ts`. All `error.tsx` files capture exceptions to Sentry.
