---
name: gate-check
description: Run the milestone gate checks (typecheck + lint + test) and report results. Use after completing any milestone or before proceeding to the next one.
user-invocable: true
argument-hint: "[--fix to auto-fix lint issues]"
---

# Gate Check

Run the project's gating checks and report a clear pass/fail for each:

1. Run `npm run typecheck` — report any type errors with file:line references
2. Run `npm run lint $ARGUMENTS` — report any lint errors
3. Run `npm run test` — report test results and coverage summary

For each step:
- If it passes, report ✓ with a one-line summary
- If it fails, report ✗ with the specific errors

At the end, give a clear verdict: **GATE PASSED** or **GATE FAILED** with what needs fixing.

If `$ARGUMENTS` contains `--fix`, run `npm run lint -- --fix` instead of plain lint.
