# Task Tracking

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
