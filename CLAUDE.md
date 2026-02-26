# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Alquemist is an agricultural/horticultural management platform — cultivation tracking, inventory, quality control, IoT monitoring, scheduling, and offline-capable operations. Multi-tenant with role-based access (admin, manager, supervisor, operator, viewer).

## Foundational Documents

Three documents define the entire system. **Read the relevant document(s) before planning any feature or change.**

### Architecture — `docs/fundational/alquemist-architecture-system.md`

The single source of truth for HOW the system is built. Consult when:

- Deciding **PostgREST vs Edge Function** for a new endpoint (§5 — ~70% PostgREST for CRUD, ~30% Edge Functions for transactional flows)
- Implementing **auth, RLS, or multi-tenancy** (§7 — 4 RLS policy types, roles in app_metadata, service role usage)
- Working with **triggers or database functions** (§4 — inventory balance, zone capacity, facility totals, updated_at)
- Building **async jobs** (§8 — pg_cron: expiring docs, overdue activities, low inventory, stale batches, env readings)
- Setting up **file uploads** (§9 — Supabase Storage buckets, RLS on storage)
- Implementing **IoT/environmental monitoring** (§10 — webhook pipeline, sensor readings)
- Making **deployment or infrastructure** decisions (§11-12 — Vercel + Supabase Cloud, scalability limits)
- Working on **offline/PWA** features (§1 — retry queue in Service Worker, not offline-first)
- Choosing **Server vs Client Components** (§6 — SSR for dashboards/lists, Client for forms/interactivity)

### Data Model — `docs/fundational/alquemist-data-model`

The single source of truth for WHAT the system manages. Consult when:

- Writing or reviewing **SQL migrations** — exact column types, ENUMs, FK relationships, constraints, defaults
- Implementing **any feature that touches a table** — understand the table's domain, cross-domain FKs, and which fields are calculated vs stored
- Understanding **operational flows** — Flows 1-8 show step-by-step how tables interact during real operations (order creation, harvest, shipment reception, split/merge, etc.)
- Writing **queries or aggregations** — §7 has recommended composite indexes and 16 analytical query patterns
- Working with **inventory** — immutable append-only transactions, transformation_out/in pairs, related_transaction_id linking
- Understanding **batch as nexus** — how the central batch table connects all 9 domains via cross-domain FKs

### Master Plan — `docs/prd/00-prd-master-plan.md`

The roadmap for all 43 PRDs across 9 phases. Consult when:

- Starting a **new PRD implementation** — phase dependencies, required tables, exact ENUM values per phase
- Needing the **PRD template** structure for writing new PRDs
- Understanding **phase order** and what each phase unlocks for subsequent phases

## PRD Implementation

43 PRDs across 9 phases define every page in the system. **Before implementing any feature:**

1. Check `tasks/prd-implementation.md` for current progress and what's next
2. Read the relevant PRD in `docs/prd/<grupo>/<pagina>.md`
3. Read the master plan phase section in `docs/prd/00-prd-master-plan.md` for dependencies and ENUMs
4. Update the tracker status (`[-]` in progress / `[x]` done) as you go
5. **Keep PRD in sync**: Any adjustment during implementation (new fields, changed flows, added validations, removed features, UX changes) must be reflected back in the corresponding PRD. The PRD is the living spec — it must always match what was actually built
6. **Strategic commits**: Commit at logical checkpoints — after migrations, after server actions, after UI components, after verification. Don't accumulate all changes into one massive commit

Phases must be implemented in order — each phase depends on the previous ones.

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

## Workflow Orchestration

### 1. Plan Node Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy

- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One tack per subagent for focused execution

### 3. Self-Improvement Loop

- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done

- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests - then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections
