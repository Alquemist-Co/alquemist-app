# GEMINI.md - Alquemist CLI Guidelines

This file provides foundational context and instructions for AI agents working in the Alquemist repository.

## Project Overview

**Alquemist** is an agricultural/horticultural management platform designed for multi-tenant, role-based operations. It handles cultivation tracking, inventory, quality control, IoT monitoring, and scheduling with a focus on simplicity and scalability.

### Core Tech Stack
- **Frontend:** Next.js 15+ (App Router), React 19, TypeScript.
- **Styling:** Tailwind CSS v4, shadcn/ui.
- **Backend/Database:** Supabase (PostgreSQL 15+, Auth, Storage, Edge Functions).
- **API Strategy:** 
    - **PostgREST (~70%):** Direct CRUD for catálogos and configuration.
    - **Edge Functions (~30%):** Orchestration for complex transactional flows (split/merge, harvest, etc.).
- **Validation:** Zod v4 (shared schemas in `packages/schemas`).
- **State Management:** React Query (@tanstack/react-query).
- **Testing:** Vitest + React Testing Library.

## Key Foundational Documents

Always consult these before implementing features or changes:
- `CLAUDE.md`: High-level guidance for AI agents.
- `docs/fundational/alquemist-architecture-system.md`: Deep dive into system architecture, RLS patterns, and API design.
- `docs/fundational/alquemist-data-model`: Source of truth for database schema, ENUMs, and operational flows.
- `docs/prd/00-prd-master-plan.md`: The roadmap of 43 PRDs across 9 phases.

## Building and Running

### Prerequisites
- `pnpm` (Workspace manager)
- `Supabase CLI` (For local database and migrations)

### Commands
- **Dev:** `pnpm dev` (Runs Next.js with Turbopack)
- **Build:** `pnpm build`
- **Test:** `pnpm test` (Vitest)
- **Lint:** `pnpm lint` (ESLint)
- **Type-Check:** `pnpm type-check` (tsc)
- **Format:** `pnpm format` (Prettier)
- **Local Supabase:** `supabase start`, `supabase stop`, `supabase db reset`

## Development Conventions

### 1. Architecture Patterns
- **Multi-Tenancy:** Strictly enforced via Row Level Security (RLS) on `company_id`. Use `get_my_company_id()` helper in SQL.
- **Server vs Client Components:** 
    - Use **Server Components** by default for dashboards, lists, and static content.
    - Use **Client Components** for interactive forms, real-time updates, and components requiring React hooks.
- **Server Actions:** Use for mutations (forms, state changes) instead of direct API routes when possible.
- **Shared Schemas:** Always define Zod schemas in `packages/schemas/src` to share between frontend and Edge Functions.

### 2. Implementation Workflow
- **Plan First:** Always update `tasks/todo.md` before starting a task.
- **Reproduce First:** For bugs, create a reproduction test case or script before fixing.
- **Verify Always:** Run `pnpm type-check` and `pnpm lint` after any modification.
- **Update PRDs:** If implementation deviates from the PRD, update the PRD doc in `docs/prd/` to match reality.

### 3. Coding Style
- **Language:** English for code (variables, comments, docs), but the **User Interface (UI) is in Spanish**.
- **Naming:** CamelCase for components/types, camelCase for variables/functions, snake_case for database columns/tables.
- **Imports:** Use absolute paths with `@/` alias (e.g., `import { Button } from '@/components/ui/button'`).

### 4. Git & Commits
- **Strategic Commits:** Commit after logical milestones (e.g., migrations, server actions, UI components).
- **Commit Messages:** Clear and concise, focusing on "why" rather than "what".

## Current Progress (Phase 3)
We are currently transitioning from **Phase 2 (Settings)** to **Phase 3 (Areas + Inventory)**. 
- Track progress in `tasks/prd-implementation.md`.
- Capture lessons and patterns in `tasks/lessons.md`.
