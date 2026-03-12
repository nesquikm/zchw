# AgentView — AI Agent Analytics Dashboard

## What This Is

AgentView is an organizational analytics dashboard for engineering teams using cloud-based AI coding agents. It answers: "Is our AI investment paying off?" and "Where should we invest more?"

Two interfaces to the same data (with a third planned):
1. **Web Dashboard** — browser SPA for deep exploration
2. **MCP Server** — conversational analytics via tools + interactive MCP Apps
3. **A2A Protocol** *(future scope)* — agent-to-agent interface so autonomous agents can query org analytics programmatically (see requirements.md §8)

## Methodology: Spec-Driven Development (SDD)

This project follows Zencoder's SDD methodology. All specs live in `specs/` and are the source of truth.

**Spec precedence:** requirements.md > testing-spec.md > technical-spec.md > plan.md

If implementation contradicts a spec, the spec wins. If you must deviate, add `SPEC_DEVIATION: [reason]` in the code and flag for review.

**Development order:** schemas → tests (RED) → implementation (GREEN) → verify → refactor

## Architecture

```
packages/
├── shared/          # Zod schemas, mock data generator, services, utils
│   └── src/
│       ├── types/   # Zod schemas (the data contract)
│       ├── mock/    # Seeded deterministic data generator
│       ├── services/# Analytics query/aggregation functions
│       └── utils/   # Formatters, calculations
├── web/             # Vite + React 19 SPA
│   └── src/
│       ├── routes/  # TanStack Router file-based routes
│       ├── components/
│       └── hooks/
└── mcp-server/      # MCP SDK server with stdio + HTTP transport
    ├── tools/       # 5 model-facing + 5 app-only tools
    ├── formatters/  # Text summary formatters
    └── apps/        # MCP App UIs (single-file HTML)
```

## Tech Stack

- **Language:** TypeScript 5 (strict mode)
- **Build:** Vite 7, npm workspaces
- **Web:** React 19, TanStack Router, TanStack Query, shadcn/ui, Tailwind CSS 4, Recharts 3
- **MCP:** @modelcontextprotocol/sdk, stdio + StreamableHTTPServerTransport
- **Testing:** Vitest 4 (workspace mode), React Testing Library, @testing-library/user-event
- **Validation:** Zod 4 (schemas are the contract between all layers)

## Key Commands

```bash
npm run dev:web       # Start web dashboard (localhost:5173)
npm run dev:mcp       # Start MCP server (HTTP dev mode with watch)
npm run build         # Build all packages
npm run test          # Run all tests
npm run typecheck     # TypeScript type checking
npm run lint          # ESLint + Prettier
```

**Gating rule:** Every milestone must pass before proceeding:
```bash
npm run typecheck && npm run lint && npm run test
```

## Implementation Plan

Work follows milestones M1–M12 defined in `specs/plan.md`. Execute one milestone at a time. Do not proceed to M(n+1) until M(n) gates pass.

**Non-negotiable core:** M1-M6 + M7 + M9 (foundation + Impact page + MCP tools with text)

## Testing Conventions

- **TDD:** Write tests first (RED), implement (GREEN), verify gates pass (VERIFY), then refactor
- **Use real generator:** Service tests use the actual mock generator with seed 42, never hand-crafted fixtures
- **Freeze time:** All tests use `vi.useFakeTimers()` with `2026-03-01T00:00:00Z`
- **Timezone:** Tests run with `TZ=UTC`
- **Invariants over spot-checks:** Assert properties that hold for any seed, not just specific values
- **Multi-seed tests:** Use seeds `[42, 123, 999, 7777, 31415]` for invariant tests
- **Test structure:** `tests/unit/` and `tests/integration/` at project root

### Coverage Targets

| Layer | Target | Minimum |
|-------|--------|---------|
| Shared services | ≥90% | 80% |
| Shared utils | ≥95% | 90% |
| Mock generator | ≥80% | 70% |
| Web components | ≥60% | 50% |
| MCP tools | ≥80% | 70% |
| Overall | ≥75% | 65% |

## Mock Data Conventions

- Anchored to `now = 2026-03-01T00:00:00Z`
- 90-day window: Dec 1, 2025 – Feb 28, 2026
- Default seed: 42 (mulberry32 PRNG for determinism)
- 1 org, 5 teams, 30 users, 3 LLM providers, 5 models
- ~15,000 agent sessions, ~3,000 non-agent PRs, ~500 security events
- Sessions in last 48h (Feb 27-28) have pending verification status

## Key Domain Concepts

- **Verified outcome:** merged PR + CI pass + no revert within 48h
- **Autonomy levels:** L1 (Guided), L2 (Supervised), L3 (Autonomous)
- **North Star metric:** Cost per verified outcome (fully-loaded, includes failed/abandoned sessions)
- **Measurement integrity:** Every metric labeled as "Observed" (git/CI events) or "Estimated" (model-derived)

## DO NOT

- Implement login/auth flows or user management
- Connect to real external services — all data is mocked
- Store user data/PII beyond localStorage UI preferences
- Build real-time updates (WebSocket/SSE/polling)
- Add admin panels, settings pages, or billing UI
- Add a multi-org switcher or org management features (single org, hardcoded)
- Implement CSV/PDF export, email reports, or Slack notifications
- Build per-user drill-down or individual developer analytics
- Require a backend server for the web dashboard (client-side SPA only)
- Add AI chat to the web dashboard (MCP server is the AI interface)

## Coding Standards

- Zod schemas are the single source of truth for types — derive TS types with `z.infer<>`
- Services are pure functions: `(filters, now?) → typed result` operating on in-memory mock data
- No `any` types — use Zod inference
- Components receive data via props, wrapped in TanStack Query hooks
- URL search params are the source of truth for filter state (TanStack Router)
- Use shadcn/ui components — don't reinvent UI primitives
