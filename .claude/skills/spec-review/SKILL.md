---
name: spec-review
description: Review implementation against specs to find deviations, missing features, or inconsistencies. Use to audit whether the code matches what the specs require.
user-invocable: true
allowed-tools: ['Read', 'Glob', 'Grep', 'Agent']
argument-hint: "[FR-1, FR-2, ... or 'all' to check everything]"
---

# Spec Review

Audit the implementation against the project specifications for: `$ARGUMENTS`

## Process

1. **Read specs** — Load the relevant sections from:
   - `specs/requirements.md` — functional requirements and acceptance criteria
   - `specs/technical-spec.md` — architecture and implementation details
   - `specs/testing-spec.md` — test coverage and conventions
   - `specs/plan.md` — milestone definitions

2. **Scan implementation** — For each requirement/AC:
   - Find the implementing code (service, component, route, test)
   - Check if the implementation matches the spec
   - Check if tests exist and cover the acceptance criteria

3. **Report findings** as a table:

| Requirement | Status    | Implementation         | Notes                             |
| ----------- | --------- | ---------------------- | --------------------------------- |
| AC-1.1      | ✓ Done    | dashboard/index.tsx:42 |                                   |
| AC-1.2      | ✗ Missing | —                      | Measurement badge not implemented |
| AC-1.3      | ⚠ Partial | metric-card.tsx:15     | Tooltip missing hover text        |

4. **Summary** — Overall completion %, critical gaps, and recommended next steps.

Use the traceability matrix in `specs/requirements.md` §10 to map requirements → files → tests.
