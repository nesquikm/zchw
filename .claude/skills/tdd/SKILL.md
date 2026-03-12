---
name: tdd
description: Execute TDD cycle for a specific test file or feature. Runs RED (write failing test) → GREEN (implement) → VERIFY (all gates pass). Use when building features following the project's TDD methodology.
user-invocable: true
argument-hint: "<test-file-path or feature description>"
---

# TDD Cycle

Execute the project's TDD workflow for: `$ARGUMENTS`

## Process

### 1. RED — Write Failing Tests
- Read the relevant spec(s) in `specs/` to understand requirements
- Write test(s) following conventions in `specs/testing-spec.md`
- Use `vi.useFakeTimers()` with `2026-03-01T00:00:00Z`
- Use seed 42 for deterministic mock data
- Run the test and confirm it FAILS (red)
- If the test file already exists and passes, skip to VERIFY

### 2. GREEN — Implement
- Write the minimum code to make tests pass
- Follow Zod-first approach: schemas define the contract, `z.infer<>` for types
- Services are pure functions: `(dataset, filters) → typed result`
- Run the specific test file and confirm it PASSES (green)

### 3. VERIFY — Gate Check
- Run `npm run typecheck` — fix any type errors
- Run `npm run lint` — fix any lint errors
- Run `npm run test` — ensure no regressions

Report each phase clearly. If VERIFY fails, fix issues and re-verify before declaring done.

## Spec Precedence
requirements.md > testing-spec.md > technical-spec.md > plan.md

If implementation requires deviating from a spec, add `SPEC_DEVIATION: [reason]` in the code.
