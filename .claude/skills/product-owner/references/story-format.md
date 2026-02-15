# User Story Format & Best Practices

## Story Template

```markdown
# US-[FEATURE_ID]-[SEQ]: [Short title]

## User Story

**As a** [specific user role/persona],
**I want** [action/capability],
**So that** [business value/benefit].

## Acceptance Criteria

### Scenario 1: [Happy path scenario name]
- **Given** [precondition]
- **When** [action]
- **Then** [expected result]

### Scenario 2: [Alternative/edge case name]
- **Given** [precondition]
- **When** [action]
- **Then** [expected result]

### Scenario 3: [Error/boundary case name]
- **Given** [precondition]
- **When** [action]
- **Then** [expected result]

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing (if applicable)
- [ ] Acceptance criteria verified
- [ ] Documentation updated (if applicable)
- [ ] Accessibility requirements met (if UI)
- [ ] Performance within acceptable thresholds

## Technical Notes
[Optional: Architecture considerations, API contracts, dependencies, migration needs]

## UI/UX Notes
[Optional: Wireframe references, interaction details, responsive behavior]

## Dependencies
- [List any blocking stories or external dependencies]

## Estimation
- **Size**: [XS | S | M | L | XL]
- **Complexity**: [Low | Medium | High]
```

## INVEST Criteria

Every story MUST satisfy all six INVEST criteria:

| Criterion | Question to validate |
|-----------|---------------------|
| **I**ndependent | Can this story be developed and delivered without depending on another story in the same sprint? |
| **N**egotiable | Does the story describe the *what* and *why* without dictating the *how*? |
| **V**aluable | Does the story deliver clear value to the end user or stakeholder? |
| **E**stimable | Is the scope clear enough for the team to estimate effort? |
| **S**mall | Can this story be completed within a single sprint? |
| **T**estable | Can every acceptance criterion be objectively verified? |

## Acceptance Criteria Rules

1. Use Given/When/Then (Gherkin) format for all scenarios
2. Include at minimum:
   - 1 happy path scenario
   - 1 edge case or alternative flow
   - 1 error/validation scenario (when applicable)
3. Each scenario must be independently testable
4. Avoid ambiguous language ("fast", "user-friendly", "easy") — use measurable terms
5. Cover both functional and non-functional requirements when relevant

## Story Sizing Guide

| Size | Description | Rough guideline |
|------|-------------|-----------------|
| XS | Trivial change, single file, no logic | Config change, copy update |
| S | Small isolated change, clear scope | Single component, simple endpoint |
| M | Moderate scope, some complexity | Feature with 2-3 components, API + UI |
| L | Significant scope, multiple concerns | Full feature, multiple services |
| XL | Too large — should be split | Epic-level work, needs decomposition |

If a story is sized XL, split it into smaller stories before adding to the backlog.

## Writing Quality Checklist

- User role is specific (not "user" — use "authenticated customer", "admin", "guest visitor")
- Action is concrete and observable
- Benefit ties to a business or user outcome
- No implementation details in the story statement
- Acceptance criteria cover happy path, edge cases, and errors
- No duplicate stories in the backlog
- Dependencies are explicitly listed
