---
name: milestone
description: Execute a specific milestone from the implementation plan. Reads the plan, executes all tasks in TDD order, runs gate checks, and self-reviews against specs before human review. Use to build the project milestone by milestone.
user-invocable: true
argument-hint: '<milestone number, e.g. M1, M2, M3>'
---

# Execute Milestone

Execute milestone `$ARGUMENTS` from the implementation plan.

## Process

### Phase 1: Plan & Prepare

1. **Read the plan** — Open `specs/plan.md` and find milestone `$ARGUMENTS`
2. **Read relevant specs** — Check `specs/requirements.md` and `specs/technical-spec.md` for the requirements this milestone covers
3. **Build the AC checklist** — Extract every acceptance criterion (AC) for this milestone as a binary pass/fail checklist. This is your **quality gate** — the definition of "done"
4. **Check prerequisites** — Verify that previous milestones' artifacts exist (files, exports, passing tests)

### Phase 2: Build (DAG — sequential steps, not a loop)

5. **Execute tasks in TDD order:**
   - For each task in the milestone:
     a. Write tests first (if specified in the milestone's test section)
     b. Run tests — confirm RED (failing)
     c. Implement the code
     d. Run tests — confirm GREEN (passing)
6. **Gate check** — Run `npm run typecheck && npm run lint && npm run test`
   - This is the **deterministic kill switch** — if it fails, fix before proceeding
   - Do NOT let LLM judgment override a failing gate

### Phase 3: Self-Review Loop (max 2 rounds)

> Principle: "Never let an LLM be the only thing standing between you and an infinite loop."
> The gate check is the hard stop. This review loop is the "smart stop" layer.

7. **Round N (N = 1, 2):**

   a. **Quality gate check** — Walk the AC checklist from step 3. For each AC, mark:
   - ✓ Pass — implementation matches spec, test covers it
   - ✗ Fail — missing, wrong, or untested
   - ⚠ Partial — implemented but incomplete or deviating

   b. **Code audit** — Re-read every file created/modified in this milestone. Look for:
   - Logic bugs, off-by-one errors, wrong comparisons
   - Missing edge cases the tests don't cover
   - Spec drift (implementation doesn't match spec wording)
   - Schema misuse (hardcoded values that should come from Zod schemas)
   - Untested code paths

   c. **Decision (deterministic, not LLM vibes):**
   - **All ACs pass + no bugs found** → exit loop, proceed to report
   - **Issues found, round 1** → fix issues, re-run gate check, go to round 2
   - **Issues found, round 2** → check for convergence:
     - If round 2 found the **same issue classes** as round 1 → **stop and escalate** to human with findings (deadlock detected — you're going in circles)
     - If round 2 found **new/different issues** → fix, re-run gate check, then escalate to human with findings (diminishing returns — let human judge)

   d. **After any fix** — always re-run the full gate check before continuing

### Phase 4: Report & Handoff

8. **Report** — Present to the user:
   - AC checklist with pass/fail status for each criterion
   - Files created/modified
   - Any SPEC_DEVIATIONs
   - Self-review findings (what was caught and fixed, what remains)
   - Gate check result
   - Number of review rounds used
9. **Human review** — Ask the user to review the code before committing. Wait for explicit approval. Do NOT commit until the user confirms.
10. **Commit** — Only after the user approves, create a git commit

## Rules

- Do NOT proceed if the gate check fails — fix issues first
- Do NOT skip tests — this project follows strict TDD
- Do NOT commit without user approval — always wait for explicit review
- Do NOT self-review more than 2 rounds — escalate to human instead of looping
- If you need to deviate from a spec, add `SPEC_DEVIATION: [reason]` in the code
- Spec precedence: requirements.md > testing-spec.md > technical-spec.md > plan.md
- The gate check (deterministic code) always overrides LLM judgment about quality
- Quality gate ACs are binary (pass/fail) — no open-ended "is this good enough?"
