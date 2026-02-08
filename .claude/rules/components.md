---
paths:
  - "src/components/**"
---

# Component Rules

- UI primitives: shadcn/ui (Radix UI) in `src/components/ui/`
- Feature components organized by domain: `dashboard/`, `scan/`, `analytics/`, `settings/`, `onboarding/`
- Use Radix UI primitives for accessibility
- Animations via Framer Motion
- Icons: Phosphor Icons (`@phosphor-icons/react`) preferred, Lucide as secondary
- All data fetching via SWR hooks from `src/hooks/`, never direct fetch in components
- Optimistic updates for CRUD operations
