# Task Tracking

## Phase 6 Pre-work (before PRD 33)

- [ ] Migration: `attachments` table (entity_type ENUM, RLS via company_id)
- [ ] Migration: `alerts` table + ENUMs (alert_type, alert_severity, alert_status)
- [ ] Migration: `sensors`, `environmental_readings` tables + ENUMs
- [ ] Migration: `overhead_costs` table + ENUMs
- [ ] Migration: 6 pg_cron jobs + SQL functions:
  - [ ] `expire_documents` (daily 1AM) — fixes Phase 5 data integrity gap
  - [ ] `check_overdue_activities` (hourly) — fixes Phase 5 data integrity gap
  - [ ] `check_expiring_documents` (daily 6AM)
  - [ ] `check_low_inventory` (daily 7AM)
  - [ ] `check_stale_batches` (daily 8AM)
  - [ ] `check_env_readings` (every 15 min)
- [ ] Photo upload in execute-activity (PRD 27 RF-12 to RF-15) — implement with attachments table
- [ ] Integration tests for `execute-activity` Edge Function

## PRD 15 — Zones Implementation

- [x] Zod schemas: `packages/schemas/src/zones.ts` (zoneSchema + zoneStructureSchema)
- [x] Shared component: `components/areas/zones-shared.tsx` (types, labels, ZoneDialog, StructureDialog)
- [x] Client component: `components/areas/zones-list-client.tsx` (table, FilterPopover, URL params, pagination)
- [x] Server page: `app/(dashboard)/areas/zones/page.tsx` (searchParams, server-side filtering + pagination)
- [x] Tracker updates

### Verification

- [x] `pnpm tsc --noEmit` — no type errors
- [x] `pnpm lint` — passes (0 new errors/warnings)

## PRD 14 — Facilities Implementation

- [x] Database migration: facilities, zones, zone_structures + ENUMs + triggers + RLS
- [x] Reset DB & regenerate TypeScript types
- [x] Install shadcn Textarea component
- [x] Zod schema: `packages/schemas/src/facilities.ts`
- [x] Shared component: `components/areas/facilities-shared.tsx` (types, labels, icons, dialog)
- [x] Client component: `components/areas/facilities-list-client.tsx` (card grid, filters, actions)
- [x] Server page: `app/(dashboard)/areas/facilities/page.tsx`
- [x] Areas redirect: `app/(dashboard)/areas/page.tsx` → `/areas/facilities`
- [x] Sidebar nav: enabled Áreas link
- [x] Tracker updates

### Verification

- [x] `supabase db reset` — migration applies cleanly
- [x] `pnpm tsc --noEmit` — no type errors
- [x] `pnpm lint` — passes (0 new errors/warnings)

## PRD Authoring

### Fase 3 — Áreas e Inventario (8 PRDs)

- [x] PRD 14: areas-facilities
- [x] PRD 15: areas-zones
- [x] PRD 16: areas-zone-detail
- [x] PRD 17: inventory-products
- [x] PRD 18: inventory-suppliers
- [x] PRD 19: inventory-shipments
- [x] PRD 20: inventory-shipment-detail
- [x] PRD 21: inventory-recipes

### Fase 4 — Producción (4 PRDs)

- [x] PRD 22: production-orders
- [x] PRD 23: production-order-detail
- [x] PRD 24: production-batches
- [x] PRD 25: production-batch-detail

### Fase 5 — Actividades, Calidad y Regulatorio (7 PRDs)

- [x] PRD 26: activities-schedule
- [x] PRD 27: activities-execute
- [x] PRD 28: activities-history
- [x] PRD 29: quality-tests
- [x] PRD 30: quality-test-detail
- [x] PRD 31: regulatory-documents
- [x] PRD 32: regulatory-document-detail

### Fase 6 — Operaciones (4 PRDs)

- [x] PRD 33: operations-alerts
- [x] PRD 34: operations-environmental
- [x] PRD 35: operations-sensors
- [x] PRD 36: operations-costs

### Fase 7 — Inventario Operativo (2 PRDs)

- [x] PRD 37: inventory-items
- [x] PRD 38: inventory-transactions

## Auth Invite, Forgot/Reset Password (PRDs 03, 04, 05)

- [x] Add Zod schemas — `inviteActivationSchema`, `forgotPasswordSchema`, `resetPasswordSchema`
- [x] Extract `getRoleRedirect` to shared util `lib/auth/utils.ts`
- [x] Create auth callback Route Handler — `app/auth/confirm/route.ts`
- [x] Update middleware — add `/auth/confirm` and `/invite` as public routes
- [x] Implement PRD 04 — `/forgot-password` page (email input → success message)
- [x] Implement PRD 05 — `/reset-password` page (session check, password form, sign out after)
- [x] Implement PRD 03 — `/invite` page + server action (user activation, auto-login)
- [x] Install shadcn badge component
- [x] Update PRD docs (route changes) and implementation tracker

### Verification

- [x] `pnpm type-check` — passes
- [x] `pnpm lint` — passes (0 errors, 0 warnings)

## Auth Signup (PRD 02)

- [x] Create static data — `lib/data/countries.ts` (countries, timezones, currencies)
- [x] Add signupSchema to `packages/schemas/src/auth.ts`
- [x] Export signupSchema from `packages/schemas/src/index.ts`
- [x] Create Server Action — `app/(auth)/signup/actions.ts` (atomic company+user creation with rollback)
- [x] Create signup page — `app/(auth)/signup/page.tsx` (two-step form, stepper, country auto-fill)

### Verification

- [x] `pnpm type-check` — passes
- [x] `pnpm lint` — passes (0 errors, 0 warnings)

## Pre-Auth Foundation + Auth Login (PRD 01)

- [x] Foundation migration (companies, users, ENUMs, RLS, helpers)
- [x] Start local Supabase + apply migration
- [x] Generate TypeScript types from database
- [x] Create `.env.local` from local Supabase
- [x] Create `lib/supabase/admin.ts` (service role client)
- [x] Create auth Zod schemas (`packages/schemas/src/auth.ts`)
- [x] Install deps (server-only, shadcn form component)
- [x] Mount Toaster in providers
- [x] Implement `/login` page (React Hook Form, Zod, role redirect, Spanish UI)
- [x] Update middleware with auth redirects (protect routes, redirect authenticated away from /login)

### Verification

- [x] `pnpm type-check` — passes
- [x] `pnpm lint` — passes
- [x] `pnpm dev` + `curl /login` — 200 OK

## Initial Project Setup

- [x] Scaffold Next.js 15+ with pnpm (Next.js 16.1.6, React 19.2.3)
- [x] Update .gitignore for pnpm
- [x] Install runtime deps (@supabase/ssr, @tanstack/react-query, zod, recharts, etc.)
- [x] Install dev deps (vitest, testing-library, prettier, etc.)
- [x] Initialize shadcn/ui (New York style, neutral, CSS variables)
- [x] Install starter components (button, input, label, card, sonner)
- [x] Configure ESLint + Prettier
- [x] Configure Vitest (jsdom, globals, passWithNoTests)
- [x] Set up Supabase client utilities (client, server, middleware)
- [x] Create core app structure (layouts, providers, route groups)
- [x] Create types directory (database placeholder, UserRole)
- [x] Set up .env.example
- [x] Configure tsconfig paths + vitest globals
- [x] Initialize Supabase project (config.toml, migrations/, functions/)
- [x] Create shared schemas package (@alquemist/schemas)
- [x] Add package.json scripts (dev, build, lint, format, test, type-check)

### Verification

- [x] `pnpm type-check` — passes
- [x] `pnpm lint` — passes
- [x] `pnpm format:check` — passes
- [x] `pnpm dev` — dev server starts on localhost:3000
- [x] `pnpm test:run` — Vitest initializes (0 tests, no errors)
