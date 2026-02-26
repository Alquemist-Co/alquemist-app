# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Alquemist is an agricultural/horticultural management platform — cultivation tracking, inventory, quality control, IoT monitoring, scheduling, and offline-capable operations. Multi-tenant with role-based access (admin, manager, supervisor, operator, viewer).

## Foundational Documents

Two specification documents define the entire system. **Before planning any feature or change, read the relevant foundational document(s)** to understand domain context, table relationships, and architectural constraints.

| Document                                            | What it covers                                                                                                                                                                                                                       |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docs/fundational/alquemist-architecture-system.md` | System architecture, tech stack decisions, API layer (PostgREST ~70% + Edge Functions ~30%), security/multi-tenancy patterns, deployment strategy (Vercel + Supabase Cloud), scalability constraints, IoT pipeline, offline strategy |
| `docs/fundational/alquemist-data-model`             | Complete data model: 45 tables in 9 domains + batch nexus, all operational flows (8 detailed), cross-domain FK relationships, recommended indexes, analytical query patterns                                                         |

## PRD Implementation

43 PRDs across 9 phases define every page in the system. **Before implementing any feature:**

1. Check `tasks/prd-implementation.md` for current progress and what's next
2. Read the relevant PRD in `docs/prd/<name>/<name>.md`
3. Read the master plan phase section in `docs/prd/00-prd-master-plan.md` for dependencies and ENUMs
4. Update the tracker status (`[-]` in progress / `[x]` done) as you go
5. **Keep PRD in sync**: Any adjustment during implementation (new fields, changed flows, added validations, removed features, UX changes) must be reflected back in the corresponding PRD. The PRD is the living spec — it must always match what was actually built
6. **Strategic commits**: Commit at logical checkpoints — after migrations, after server actions, after UI components, after verification. Don't accumulate all changes into one massive commit

Phases must be implemented in order — each phase depends on the previous ones.

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

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
