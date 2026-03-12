# Development Process

## Methodology: Spec-Driven Development (SDD)

This project follows [Zencoder's SDD methodology](https://zencoder.ai/blog/spec-driven-development-sdd-the-engineering-method-ai-needed) — an AI-first engineering approach where specifications are written before code, and AI agents execute against an approved blueprint.

### Why SDD?

Traditional "vibe coding" gives AI agents loose prompts and hopes for the best. SDD inverts this: the human defines *what* to build through structured specs, the agent executes *how* through a verified plan. The result is reproducible, auditable, and dramatically more reliable.

### Core Principle

**Specs are the single source of truth, not code.** If the implementation contradicts a spec, the spec wins. If deviation is necessary, it's marked with `SPEC_DEVIATION: [reason]` in the code and flagged for human review.

## Spec Artifacts

SDD produces three core artifacts (we add a fourth — the testing spec — as a validation layer):

```
specs/
├── assignment.md        # Original brief from Zencoder
├── requirements.md      # WHAT to build — features, acceptance criteria, constraints
├── testing-spec.md      # HOW to validate — test structure, invariants, coverage targets
├── technical-spec.md    # HOW to build — architecture, schemas, data model, APIs
└── plan.md              # WHEN to build — milestones, task order, triage decisions
```

**Precedence:** requirements.md > testing-spec.md > technical-spec.md > plan.md

Each artifact builds on the previous. Requirements define the product. The testing spec defines what "correct" means. The technical spec defines the architecture. The plan breaks it into executable steps.

## Development Cycle: RED / GREEN / VERIFY

Every feature follows the TDD loop prescribed by SDD:

```
┌─────────────────────────────────────────────────┐
│                                                 │
│   1. Schema    Define the data contract (Zod)   │
│       │                                         │
│       ▼                                         │
│   2. RED       Write failing tests              │
│       │                                         │
│       ▼                                         │
│   3. GREEN     Implement until tests pass       │
│       │                                         │
│       ▼                                         │
│   4. VERIFY    Run gate checks:                 │
│       │        npm run typecheck                │
│       │        npm run lint                     │
│       │        npm run test                     │
│       │                                         │
│       ▼                                         │
│   5. Refactor  Clean up, then re-verify         │
│                                                 │
└─────────────────────────────────────────────────┘
```

**No step is skipped.** Tests are written before implementation, not after. The gate check runs after every milestone — not just at the end.

## Milestone Execution

Work is organized into 12 milestones (M1–M12) plus stretch goals (S1–S5). Each milestone is independently testable and gated.

### Execution Rules

1. **One milestone at a time.** Do not start M(n+1) until M(n) gates pass.
2. **Gate before proceeding:** `npm run typecheck && npm run lint && npm run test`
3. **Shared layer first.** M2–M5 build the foundation (schemas, generator, utils, services). Both web and MCP depend on it.
4. **Commit on gate pass.** Each milestone that passes its gate gets a commit.

### Milestone Map

```
M1   Project Scaffolding          ─── configs, monorepo, CI
M2   Zod Schemas + Types          ─── data contracts
M3   Mock Data Generator          ─── 90 days of realistic data
M4   Utility Functions            ─── formatters, calculations
M5   Service Layer                ─── 5 analytics services
M6   Web Layout + Routing         ─── shell, sidebar, filters
M7   Impact Summary Page          ─── hero page (FR-1)         ◄── non-negotiable
M8   Spend & Forecasting Page     ─── cost analytics (FR-2)
M9   MCP Server + Tools           ─── 10 tools, text + data    ◄── non-negotiable
M10  MCP App UIs                  ─── interactive apps
M11  AI Integration Callout       ─── MCP promotion banner
M12  Polish + CI Green            ─── final cleanup
───────────────────────────────────────────────────────────
S1   Adoption Page (FR-3)         ─── stretch
S2   Quality Page (FR-4)          ─── stretch
S3   Governance Page (FR-5)       ─── stretch
S4   E2E Tests (Playwright)       ─── stretch
S5   Dark Mode                    ─── stretch
```

**Non-negotiable core:** M1–M6 + M7 + M9. This delivers a working dashboard with the hero page plus conversational analytics via MCP.

### Triage Decision Points

If time is tight:

| After | If behind | Cut |
|-------|-----------|-----|
| M5 | Services slow | Skip M10 (MCP App UIs) — text-only MCP is fine |
| M8 | Web behind | Skip chart polish — functional > pretty |
| M9 | MCP tools work | Skip M10, go to M11+M12 |
| M10 | Apps buggy | Ship Impact App only, cut Spend App |

## Slash Commands

The project includes custom skills for AI-assisted development:

| Command | Purpose |
|---------|---------|
| `/milestone M3` | Execute a specific milestone end-to-end |
| `/tdd tests/unit/shared/services/impact.test.ts` | Run a TDD cycle for a specific test/feature |
| `/gate-check` | Run typecheck + lint + test and report pass/fail |
| `/gate-check --fix` | Same, but auto-fix lint issues |
| `/spec-review FR-1` | Audit implementation against a specific requirement |
| `/spec-review all` | Full audit of all requirements |

## Testing Conventions

- **Seed 42** — default deterministic seed for all tests
- **Freeze time** — `vi.useFakeTimers()` at `2026-03-01T00:00:00Z`
- **TZ=UTC** — no locale-dependent formatting
- **Invariants > spot-checks** — assert properties that hold for any seed
- **Multi-seed tests** — seeds `[42, 123, 999, 7777, 31415]` for invariants
- **Real generator** — never hand-craft mock data; use the actual generator

### Coverage Targets

| Layer | Target | Minimum |
|-------|--------|---------|
| Shared services | ≥90% | 80% |
| Shared utils | ≥95% | 90% |
| Mock generator | ≥80% | 70% |
| Web components | ≥60% | 50% |
| MCP tools | ≥80% | 70% |
| Overall | ≥75% | 65% |

## Project Commands

```bash
npm run dev:web       # Web dashboard at localhost:5173
npm run dev:mcp       # MCP server (HTTP dev mode with watch)
npm run build         # Build all packages
npm run test          # Run all tests
npm run typecheck     # TypeScript type checking
npm run lint          # ESLint + Prettier
```

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Vite 7 + React 19, not Next.js | Client-side SPA, no SSR needed. Simpler monorepo build. |
| TanStack Router, not React Router | Type-safe search params with Zod validation — perfect for dashboard filters. |
| Zod 4 schemas as source of truth | Single contract between web, MCP, and tests. No type drift. |
| Recharts in both web and MCP Apps | Consistent charting API, shared patterns, one learning curve. |
| Seeded mock data, not random | Deterministic tests, reproducible screenshots, stable demos. |
| Monorepo with shared package | Same services power both interfaces. Change once, both update. |
