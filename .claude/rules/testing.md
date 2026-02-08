---
paths:
  - "tests/**"
  - "e2e/**"
---

# Testing Rules

- Unit tests: Vitest + jsdom in `tests/`, setup in `tests/setup.ts`
- E2E tests: Playwright in `e2e/`, auth fixtures in `e2e/fixtures/auth.ts`
- Run single unit test: `npx vitest run tests/lib/<test>.test.ts`
- Run single E2E test: `npx playwright test e2e/<test>.spec.ts`
- E2E global setup in `e2e/global-setup.ts`
- Always run existing tests before and after changes
- Never skip or disable tests to make builds pass
