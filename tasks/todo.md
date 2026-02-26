# Task Tracking

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
