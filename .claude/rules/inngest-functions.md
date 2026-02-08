---
paths:
  - "inngest/**"
---

# Inngest Background Job Rules

- Functions registered in `inngest/index.ts` and served at `/api/inngest`
- Event-driven architecture: emit events, functions react
- Key functions: daily scans, batch processing (V2 with pause/resume), weekly reports, alerts, anomaly detection
- Use `inngest.createFunction()` with proper event types
- Always handle failures gracefully with retries
- Import inngest client from `@inngest/client`
