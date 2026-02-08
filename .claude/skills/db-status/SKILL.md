---
name: db-status
description: Supabase 데이터베이스 상태와 테이블 스키마를 확인한다
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# Database Status Check

Supabase 데이터베이스 상태를 확인합니다.

## Process

1. Check Supabase client configuration in `src/lib/supabase/`
2. List all tables by searching for `.from('` patterns in the codebase
3. Check migrations in `supabase/migrations/`
4. Report:
   - Tables in use (users, brands, scans, scan_results, batch_scans_v2, question_sets, visibility_history, citations, etc.)
   - Supabase client types (server vs browser vs middleware)
   - RLS policies status
   - Environment variable status (SUPABASE_URL, SUPABASE_ANON_KEY)
   - Recent migration files
