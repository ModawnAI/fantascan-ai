---
name: run-scan
description: 스캔 시스템의 실행 상태를 확인하고 문제를 진단한다
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
---

# Run Scan Diagnostics

스캔 시스템의 상태를 진단합니다.

## Usage
`/run-scan $ARGUMENTS`

Arguments: (optional) provider name (openai, gemini, claude, grok, perplexity)

## Process

1. Check LLM provider configuration in `src/services/llm/providers/`
2. Verify environment variables for each provider in `src/lib/env.ts`
3. Check scan API routes in `src/app/api/scans/`
4. Review batch scan V2 logic in `src/services/batch-scan/`
5. Check Inngest function definitions in `inngest/functions/`
6. Report:
   - Provider availability (which API keys are configured)
   - Scan API endpoint status
   - Batch scan V2 features (pause/resume)
   - Credit costs per provider
   - Recent scan-related error patterns
