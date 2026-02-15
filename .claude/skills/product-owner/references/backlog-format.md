# Backlog Index Format

## BACKLOG.md Template

```markdown
# Product Backlog

> Last updated: [DATE]

## Summary
- **Total features**: [N]
- **Total stories**: [N]
- **Planned**: [N] | **In Progress**: [N] | **Done**: [N]

## Features

| ID | Feature | Stories | Priority | Status | Doc |
|----|---------|---------|----------|--------|-----|
| F-001 | [Feature name] | [N] | P0 - Critical | Planned | [F-001](./F-001-feature-name.md) |
| F-002 | [Feature name] | [N] | P1 - High | Planned | [F-002](./F-002-feature-name.md) |
| F-003 | [Feature name] | [N] | P2 - Medium | Planned | [F-003](./F-003-feature-name.md) |

## Priority Definitions

| Priority | Label | Description |
|----------|-------|-------------|
| P0 | Critical | Must-have for MVP / launch blocker |
| P1 | High | Core functionality, needed soon |
| P2 | Medium | Important but not blocking |
| P3 | Low | Nice-to-have, future consideration |

## Status Definitions

| Status | Description |
|--------|-------------|
| Planned | Defined and ready for development |
| In Progress | Currently being implemented |
| Done | Completed and verified |
| Deferred | Postponed to a future iteration |
```

## Feature Document Template

```markdown
# F-[ID]: [Feature Name]

## Overview
[2-3 sentence description of what this feature does and why it matters]

## User Personas
- **[Persona 1]**: [Brief context of how they interact with this feature]
- **[Persona 2]**: [Brief context if applicable]

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-[FID]-001 | [Story title] | S | P0 | Planned |
| US-[FID]-002 | [Story title] | M | P1 | Planned |

## [Stories follow below, each using the story template from story-format.md]
```

## File Naming Convention

- Backlog index: `docs/backlog/BACKLOG.md`
- Feature docs: `docs/backlog/F-[ID]-[kebab-case-name].md`
- IDs are zero-padded to 3 digits: F-001, F-002, etc.
- Story IDs within a feature: US-[FEATURE_ID]-[SEQ] (e.g., US-001-001)
