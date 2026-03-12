---
name: milestone
description: Execute a specific milestone from the implementation plan. Reads the plan, executes all tasks in TDD order, and runs gate checks. Use to build the project milestone by milestone.
user-invocable: true
argument-hint: '<milestone number, e.g. M1, M2, M3>'
---

# Execute Milestone

Execute milestone `$ARGUMENTS` from the implementation plan.

## Process

1. **Read the plan** — Open `specs/plan.md` and find milestone `$ARGUMENTS`
2. **Read relevant specs** — Check `specs/requirements.md` and `specs/technical-spec.md` for the requirements this milestone covers
3. **Check prerequisites** — Verify that previous milestones' artifacts exist (files, exports, passing tests)
4. **Execute tasks in TDD order:**
   - For each task in the milestone:
     a. Write tests first (if specified in the milestone's test section)
     b. Run tests — confirm RED (failing)
     c. Implement the code
     d. Run tests — confirm GREEN (passing)
5. **Gate check** — Run `npm run typecheck && npm run lint && npm run test`
6. **Report** — List all files created/modified, any SPEC_DEVIATIONs, and the gate check result
7. **Human review** — Ask the user to review the code before committing. Wait for explicit approval. Do NOT commit until the user confirms.
8. **Commit** — Only after the user approves, create a git commit

## Rules

- Do NOT proceed if the gate check fails — fix issues first
- Do NOT skip tests — this project follows strict TDD
- Do NOT commit without user approval — always wait for explicit review
- If you need to deviate from a spec, add `SPEC_DEVIATION: [reason]` in the code
- Spec precedence: requirements.md > testing-spec.md > technical-spec.md > plan.md
