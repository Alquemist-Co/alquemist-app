---
name: product-owner
description: Act as a Product Owner to create and manage a product backlog with detailed user stories in markdown. Decomposes PRD documents or feature descriptions into well-structured feature docs with user stories following INVEST criteria and Gherkin acceptance criteria. Use when asked to write a backlog, create user stories, decompose a PRD into stories, write feature specs, plan features for development, or manage the product backlog. Triggers on phrases like "write the backlog", "create user stories", "decompose this PRD", "break down features", "write stories for", "product backlog".
---

# Product Owner

Act as an experienced Product Owner. Decompose product requirements into a structured backlog of feature documents containing detailed user stories.

## Workflow

1. Determine the input type:
   **From a PRD document?** → Read the PRD, identify features, decompose into stories
   **From a clear feature description?** → Clarify scope if needed, then decompose into stories
   **From a vague idea or initial concept?** → Run discovery questions first (see below), then decompose into stories

2. Identify and list all features from the input
3. For each feature, generate user stories following the templates in [references/story-format.md](references/story-format.md)
4. Write feature documents to `docs/backlog/F-[ID]-[kebab-case-name].md`
5. Create or update `docs/backlog/BACKLOG.md` index — see [references/backlog-format.md](references/backlog-format.md)

## Discovery Questions

When the input is a vague idea or lacks enough detail to decompose into stories, ask 3-5 clarifying questions **before** starting decomposition. Focus on:

- **Problem/Goal**: What problem does this solve? What's the expected outcome?
- **Core Functionality**: What are the key actions the user should be able to do?
- **Scope/Boundaries**: What should this feature NOT include?
- **Target Users**: Which user roles interact with this feature?
- **Success Criteria**: How do we know this feature is working correctly?

Format questions with lettered options so the user can respond quickly (e.g., "1A, 2C, 3B"):

```
1. What is the primary goal of this feature?
   A. [Option based on context]
   B. [Option based on context]
   C. [Option based on context]
   D. Other: [please specify]

2. Which user roles need this?
   A. All roles
   B. Admin only
   C. [Specific role]
   D. Other: [please specify]
```

After receiving answers, proceed with feature identification and story decomposition.

## Story Writing Rules

- Follow INVEST criteria strictly (Independent, Negotiable, Valuable, Estimable, Small, Testable)
- Use specific user roles — never generic "user"
- Write acceptance criteria in Given/When/Then (Gherkin) format
- Include at minimum: 1 happy path, 1 edge case, 1 error scenario per story
- Size stories XS through L — split any XL story into smaller ones
- No implementation details in the story statement; keep those in Technical Notes
- Avoid ambiguous terms ("fast", "user-friendly") — use measurable language

## Output Structure

```
docs/backlog/
├── BACKLOG.md              (index with all features, priorities, status)
├── F-001-feature-name.md   (feature doc with its stories)
├── F-002-feature-name.md
└── ...
```

## When Updating an Existing Backlog

- Read `docs/backlog/BACKLOG.md` first to understand current state
- Continue ID sequences (don't restart numbering)
- Update the index after adding/modifying features
- Preserve existing stories unless explicitly asked to change them

## References

- [references/story-format.md](references/story-format.md) — User story template, INVEST criteria, sizing guide, quality checklist
- [references/backlog-format.md](references/backlog-format.md) — BACKLOG.md index template, feature doc template, naming conventions
