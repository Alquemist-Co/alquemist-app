# CLAUDE.md

## Project Overview

Alquemist is an agricultural/horticultural management platform — cultivation tracking, inventory, quality control, IoT monitoring, scheduling, and offline-capable operations. Multi-tenant with role-based access (admin, manager, supervisor, operator, viewer).

## Foundational Documents

**Read the relevant document(s) before planning any feature or change.**

- **Architecture** — `docs/fundational/alquemist-architecture-system.md` — HOW the system is built (PostgREST vs Edge Functions, auth/RLS, triggers, async jobs, file uploads, IoT, deployment, offline/PWA, Server vs Client Components)
- **Data Model** — `docs/fundational/alquemist-data-model` — WHAT the system manages (table schemas, ENUMs, FKs, operational flows, indexes, inventory transactions, batch as nexus)
- **Master Plan** — `docs/prd/00-prd-master-plan.md` — Phase dependencies, required tables, ENUM values, PRD template

## PRD Implementation

43 PRDs across 9 phases define every page in the system. **Before implementing any feature:**

1. Check `tasks/prd-implementation.md` for current progress and what's next
2. Read the relevant PRD in `docs/prd/<grupo>/<pagina>.md`
3. Read the master plan phase section for dependencies and ENUMs
4. Update the tracker status (`[-]` in progress / `[x]` done) as you go
5. **Keep PRD in sync**: Any adjustment during implementation must be reflected back in the PRD. The PRD is the living spec — it must always match what was actually built
6. **Defer across PRDs**: If a feature in PRD N depends on a table/resource from PRD M (M > N), defer that feature to PRD M. Update both PRDs. Never leave orphaned scope
7. **Sync before moving on**: After completing a PRD, compare every section against what was built before committing. Blocking step
8. **Strategic commits**: Commit at logical checkpoints — migrations, server actions, UI, verification

Phases must be implemented in order — each phase depends on the previous ones.

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

## UI Components (shadcn/ui)

Config: `components.json` (new-york style, Tailwind CSS 4, lucide icons, RSC). Import from `@/components/ui/<name>`. Use `cn()` from `lib/utils.ts`.

- **Never build custom UI** when shadcn has an equivalent — check registry first
- **Check `components/ui/` first** before adding — it may already be installed
- Use `cn()` for all className composition, never raw `clsx` or template literals
- **Adding components**: use shadcn MCP tools (search → view → examples → install → audit)

## Transactional Email (Resend)

Never use GoTrue's built-in mailer — it strips `redirect_to` in production, breaking recovery/invite flows. Use `generateLink()` + Resend instead. Reference: `app/(auth)/forgot-password/actions.ts`.

## Edge Functions

### `trigger_update_timestamps` Gotcha

The shared trigger sets `NEW.updated_by = auth.uid()`. **Every table with this trigger MUST have an `updated_by UUID` column**. Missing it causes `record "new" has no field "updated_by"` at runtime.

### New Edge Function Checklist

1. Create `supabase/functions/<name>/index.ts` — follow existing functions as reference
2. Add `[functions.<name>]` with `verify_jwt = false` in `supabase/config.toml`
3. Add integration tests in `__tests__/edge-functions/<name>.test.ts`
4. Seed data must cover happy path + error scenarios
5. Deploy: `npx supabase functions deploy <name> --no-verify-jwt --project-ref wzyomollizbhlempiabs`

## Testing

Integration tests (`pnpm test:integration`) require `pnpm dev:reset` before running — resets DB to seed state.

## Production

- **Frontend**: Vercel → `https://app.alquemist.co` (auto-deploy on push to `main`)
- **Backend**: Supabase Cloud (ref: `wzyomollizbhlempiabs`)
- **Email**: Resend (`noreply@alquemist.co`)
- **CI**: GitHub Actions (`.github/workflows/ci.yml` — lint, type-check, test, build)

### Deploying Changes

| What | Command |
|------|---------|
| Code | Push to `main` → CI → Vercel |
| Migration | `npx supabase db push --linked` |
| Edge Function | `npx supabase functions deploy <name> --no-verify-jwt --project-ref wzyomollizbhlempiabs` |
| All Edge Functions | `npx supabase functions deploy --no-verify-jwt --project-ref wzyomollizbhlempiabs` |
| EF secrets | `npx supabase secrets set KEY=VALUE --project-ref wzyomollizbhlempiabs` |

### Auth Settings (Supabase Dashboard)

- Open signup **disabled** — users join only via admin invite
- Min password length: **8**
- Site URL: `https://app.alquemist.co`
- Redirect URLs: `https://app.alquemist.co/**`

### Key Differences

- `supabase/config.toml` is **local-only** — production config lives in Dashboard
- **Preview deployments**: Vercel `*.vercel.app` URLs for PRs. Add wildcard to Supabase Dashboard → Authentication → Redirect URLs

## Workflow Orchestration

### 1. Plan Node Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy

- Use subagents liberally to keep main context window clean
- One task per subagent for focused execution

### 3. Self-Improvement Loop

- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules that prevent the same mistake
- Review lessons at session start

### 4. Verification Before Done

- Never mark a task complete without proving it works
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "is there a more elegant way?"
- Skip this for simple, obvious fixes — don't over-engineer

### 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Track Progress**: Mark items complete as you go
3. **Capture Lessons**: Update `tasks/lessons.md` after corrections
