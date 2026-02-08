---
paths:
  - "src/app/api/**"
---

# API Route Rules

- Use Next.js App Router convention: `export async function GET/POST/PUT/DELETE(request: Request)`
- Use `NextResponse.json()` for responses with appropriate HTTP status codes
- Authenticate via `createClient()` from `@/lib/supabase/server` + `supabase.auth.getUser()`
- Validate request body with Zod schemas from `@/lib/validations/`
- Use custom error classes from `@/lib/errors.ts` for consistent error responses
- Never expose internal error details to clients
- Rate limit sensitive endpoints using `@/lib/rate-limit.ts`
