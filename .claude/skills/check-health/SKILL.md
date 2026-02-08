---
name: check-health
description: 프로젝트 전체 상태를 점검한다 (TypeScript, 테스트, 린트, 의존성)
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
---

# Project Health Check

프로젝트 전체 상태를 점검합니다.

## Process

1. Run TypeScript check: `npm run typecheck`
2. Run linter: `npm run lint`
3. Run unit tests: `npm run test:run`
4. Check for outdated dependencies: review `package.json`
5. Verify environment setup: check `src/lib/env.ts` required vars
6. Report:
   - TypeScript: errors/warnings count
   - Lint: violations count
   - Tests: pass/fail count
   - Dependencies: any known issues
   - Environment: missing required variables
