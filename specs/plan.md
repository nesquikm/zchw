# Implementation Plan: AgentView

## Overview

This plan breaks the AgentView build into PR-sized milestones, each independently testable and gated. The order follows TDD: schemas → tests → services → components → integration.

**Gating rule:** Every milestone must pass `npm run typecheck && npm run lint && npm run test` before proceeding to the next.

**Spec precedence:** requirements.md > testing-spec.md > technical-spec.md > plan.md. If this plan contradicts a spec, the spec wins.

### Triage Decision Points

The milestones are ordered by dependency and value. If time is tight, use these decision points:

| After milestone | If behind schedule | Action |
|---|---|---|
| M5 (services) | Services took longer than expected | Skip M10 (MCP App UIs) — ship MCP server with text-only responses. MCP Apps can be added later without changing the tool API |
| M8 (Spend page) | Web dashboard behind | Skip chart polish. Bare functional charts > polished subset |
| M9 (MCP server) | MCP server tools work | Move to M11+M12 (banner + polish). MCP App UIs (M10) are the last thing to cut |
| M10 (MCP Apps) | App UIs are buggy | Ship Impact App only (simpler). Cut Spend App |

**The non-negotiable core** (must ship even if everything else slips): M1-M6 (foundation + layout/routing) + M7 (Impact page) + M9 (MCP tools with text). This gives a working dashboard with the hero page + conversational analytics. M6 is required because M7 depends on the layout shell, routing, and filter infrastructure it provides.

---

## M1: Project Scaffolding

**Objective:** Monorepo with all configs. Everything builds and lints with zero source code.

**Tasks:**
1. Initialize npm workspace root with `packages/shared`, `packages/web`, `packages/mcp-server`
2. Configure TypeScript (strict) — base `tsconfig.json` + per-package configs
3. Configure Vitest (workspace mode) + coverage
4. Configure ESLint + Prettier
5. Configure Tailwind CSS 4 for web package (CSS-first config via `@tailwindcss/vite` plugin — no `tailwind.config.ts`)
6. Set up GitHub Actions CI (`ci.yml`): checkout → install → typecheck → lint → test → build
7. Add root scripts: `dev:web`, `dev:mcp`, `build`, `test`, `lint`, `typecheck`
8. Verify: `npm run build && npm run lint && npm run typecheck` all pass (with empty packages)

**Files touched:**
- `package.json`, `tsconfig.json`, `vitest.config.ts`, `vitest.workspace.ts`
- `packages/shared/package.json`, `packages/shared/tsconfig.json`
- `packages/web/package.json`, `packages/web/tsconfig.json`, `packages/web/vite.config.ts`, `packages/web/index.html`
- `packages/mcp-server/package.json`, `packages/mcp-server/tsconfig.json`, `packages/mcp-server/tsconfig.server.json`
- `.github/workflows/ci.yml`
- `.eslintrc.cjs` or `eslint.config.js`

**Definition of done:** CI pipeline runs green with empty packages.

---

## M2: Zod Schemas + Types

**Objective:** All shared types defined as Zod 4 schemas. The data contract is frozen.

**Tasks:**
1. Create `packages/shared/src/types/organization.ts` — Org, Team, User schemas
2. Create `packages/shared/src/types/session.ts` — AgentSession, NonAgentPR, autonomy levels, task types, failure modes, session status
3. Create `packages/shared/src/types/metrics.ts` — TrendSchema, ImpactSummary, SpendBreakdown, AdoptionMetrics, QualityMetrics, GovernanceMetrics response schemas (all sub-schemas: TeamSpend, ModelSpend, etc.)
4. Create `packages/shared/src/types/security.ts` — SecurityEvent, SecurityEventType
5. Create `packages/shared/src/types/filters.ts` — DateRange, Filters, McpFilters schemas
6. Create `packages/shared/src/types/index.ts` — barrel export
7. Create `packages/shared/src/index.ts` — public API barrel

**Tests (write first):**
- Schema smoke tests: each schema parses a valid example, rejects an invalid one

**Definition of done:** All schemas defined, exported, `npm run typecheck` passes.

---

## M3: Mock Data Generator + Tests

**Objective:** Seeded deterministic generator producing 90 days of realistic data. Foundation for everything else.

**Tasks:**
1. Create `packages/shared/src/mock/seed.ts` — mulberry32 PRNG
2. Create `packages/shared/src/mock/organizations.ts` — 1 org, 5 teams
3. Create `packages/shared/src/mock/users.ts` — 30 users with S-curve activation
4. Create `packages/shared/src/mock/sessions.ts` — ~15,000 sessions with realistic patterns:
   - Weekday > weekend (3-5x)
   - Model cost-quality tradeoffs
   - Autonomy progression over 90 days
   - Team variance in adoption
   - No sessions before user's invitedAt
   - Verification window: PRs merged in last 48h marked as `pending` (not counted as verified)
5. Create `packages/shared/src/mock/baseline.ts` — ~3,000 non-agent PRs (for cycle time delta + agent contribution %)
6. Create `packages/shared/src/mock/security.ts` — ~500 security events (enough for meaningful governance analytics)
7. Create `packages/shared/src/mock/generator.ts` — orchestrator, accepts seed + `now` (default: `2026-03-01T00:00:00Z`)
8. Create `packages/shared/src/mock/index.ts` — exports generated dataset (seed 42)

**Tests (write first — `tests/unit/shared/mock/generator.test.ts`):**
- Determinism: same seed → identical output
- Data integrity: all foreign keys valid, dates in range, no sessions before invite
- Realistic patterns: weekday > weekend (2x+), S-curve adoption, team variance (3x+), model cost correlation
- Volume: ~15,000 sessions (±20%), ~3,000 non-agent PRs (±20%), all teams/providers/models present
- Baseline data: non-agent PRs exist for all teams, merge slower than agent-assisted
- Edge cases: at least one invited-but-never-activated user, one abandoned session, one revert, one over-budget team
- Multi-seed invariants (seeds [42, 123, 999, 7777, 31415]): no negative values, valid timestamps, valid FKs

**Definition of done:** Generator produces valid dataset. All invariant tests pass across 5 seeds.

---

## M4: Utility Functions + Tests

**Objective:** Pure formatting and calculation functions.

**Tasks:**
1. Create `packages/shared/src/utils/format.ts` — formatCurrency, formatPercent, formatDuration, formatNumber, formatTrend
2. Create `packages/shared/src/utils/calculations.ts` — calculateTrend, projectMonthEnd, calculateCycleTimeDelta
3. Create `packages/shared/src/utils/index.ts`

**Tests (write first):**
- `tests/unit/shared/utils/format.test.ts` — all formatters with edge cases (0, negative, NaN, large numbers)
- `tests/unit/shared/utils/calculations.test.ts` — trend calculation, division by zero, projection logic

**Definition of done:** All utility tests pass. 95%+ coverage on utils.

---

## M5: Service Layer + Tests

**Objective:** All 5 analytics services returning typed, correct data.

**Tasks:**
1. Create `packages/shared/src/services/impact.ts` — getImpactSummary
2. Create `packages/shared/src/services/spend.ts` — getSpendBreakdown
3. Create `packages/shared/src/services/adoption.ts` — getAdoptionMetrics
4. Create `packages/shared/src/services/quality.ts` — getQualityMetrics
5. Create `packages/shared/src/services/governance.ts` — getGovernanceMetrics
6. Create `packages/shared/src/services/index.ts`

**Tests (write first):**
- `tests/unit/shared/services/impact.test.ts` — cost per outcome formula, all 6 trend fields (nullable), cycle time delta uses non-agent baseline, sparkline adaptive length, verification window exclusion, measurement labels
- `tests/unit/shared/services/spend.test.ts` — spend by team sums to total, pro-rated budget utilization, projection ≥ spent so far, at least one team approaching/exceeding
- `tests/unit/shared/services/adoption.test.ts` — funnel monotonically decreasing, time-to-value > 0, DAU ≤ WAU
- `tests/unit/shared/services/quality.test.ts` — success rate 0-1, autonomy sums to 100%, p95 ≥ p50
- `tests/unit/shared/services/governance.test.ts` — event log sorted desc, severity distribution complete
- Filter behavior: single team, date range, model filter, combined filters, empty results
- Multi-seed invariants: non-negative totals, monotonic funnels, cross-service consistency
- `tests/integration/services.test.ts` — cross-service consistency (impact.totalSpend = spend.total, etc.)

**Definition of done:** All service tests pass. 90%+ coverage on services. Cross-service consistency verified.

---

## M6: Web — Layout, Routing, Filters

**Objective:** Dashboard shell with navigation and working filters. No page content yet.

**Tasks:**
1. Create `packages/web/src/main.tsx` — entry point with QueryClientProvider
2. Create `packages/web/src/router.ts` — TanStack Router config with search param schemas
3. Create `packages/web/src/routes/__root.tsx` — root layout: sidebar + header + filter bar
4. Create `packages/web/src/routes/index.tsx` — redirect to /dashboard
5. Create `packages/web/src/routes/dashboard.tsx` — dashboard layout with shared filters
6. Create `packages/web/src/components/layout/sidebar.tsx` — nav links
7. Create `packages/web/src/components/layout/header.tsx` — org name, date display
8. Create `packages/web/src/components/filters/date-range-picker.tsx`
9. Create `packages/web/src/components/filters/team-filter.tsx`
10. Create `packages/web/src/components/filters/model-filter.tsx`
11. Create `packages/web/src/hooks/use-analytics.ts` — TanStack Query hooks wrapping services
12. Create `packages/web/src/lib/query-client.ts`

**Tests (write first):**
- `tests/unit/web/components/filters/date-range-picker.test.tsx` — presets, custom range, validation
- Filter URL sync: changing filters updates URL, loading URL pre-fills filters

**Definition of done:** App renders sidebar, header, filter bar. Navigating between routes works. Filters sync to URL. `npm run dev:web` shows working shell.

---

## M7: Web — Impact Summary Page

**Objective:** The hero page with all FR-1 metrics.

**Tasks:**
1. Create `packages/web/src/components/metrics/metric-card.tsx` — KPI card with value, trend, sparkline, measurement badge
2. Create `packages/web/src/components/metrics/measurement-badge.tsx` — Observed/Estimated indicator
3. Create `packages/web/src/components/charts/sparkline.tsx`
4. Create `packages/web/src/routes/dashboard/index.tsx` — Impact Summary page:
   - 6 MetricCards: cost per outcome, value-to-cost, cycle time delta, agent contribution %, active users/seats, verified outcomes
   - Sparklines on each card
   - Measurement badges (observed/estimated)

**Tests (write first):**
- `tests/unit/web/components/metric-card.test.tsx` — renders value/label/trend, up/down arrows, measurement badge, sparkline
- `tests/unit/web/components/measurement-badge.test.tsx` — observed/estimated styling + tooltip
- `tests/unit/web/components/sparkline.test.tsx` — SVG points, empty data, single point
- `tests/unit/web/pages/dashboard-page.test.tsx` — page renders all 6 cards with real service data (fixed seed)

**Definition of done:** Impact Summary page renders all 6 KPIs with sparklines and measurement badges. Tests pass.

---

## M8: Web — Spend & Forecasting Page

**Objective:** All FR-2 charts and metrics.

**Tasks:**
1. Create `packages/web/src/components/charts/spend-over-time.tsx` — area chart with projection line
2. Create `packages/web/src/components/charts/budget-utilization.tsx` — horizontal bar with threshold alerts
3. Create `packages/web/src/components/charts/cost-drivers.tsx` — sorted bar chart
4. Create `packages/web/src/components/charts/model-comparison.tsx` — donut + cost-quality table
5. Create `packages/web/src/routes/dashboard/spend.tsx` — Spend page composing all charts

**Tests (write first):**
- Chart components receive data via props and render without errors
- Spend page integration: renders all charts with real service data

**Definition of done:** Spend page renders all FR-2 charts. Filter changes update charts. Tests pass.

---

## M9: MCP Server — Tools + Text Formatters

**Objective:** All 5 MCP tools registered, returning text summaries + structured data.

**Tasks:**
1. Create `packages/mcp-server/server.ts` — McpServer setup (transport-agnostic, uses `@modelcontextprotocol/sdk` + `@modelcontextprotocol/ext-apps`)
2. Create `packages/mcp-server/main.ts` — dual transport entry: stdio (default) for local clients, `--http` flag for remote HTTP access on port 3001
3. Create `packages/mcp-server/formatters/text.ts` — text summary formatters for each tool
4. Create `packages/mcp-server/tools/impact.ts` — get_impact_summary + poll_impact_data
5. Create `packages/mcp-server/tools/spend.ts` — get_spend_breakdown + poll_spend_data
6. Create `packages/mcp-server/tools/adoption.ts` — get_adoption_metrics + poll_adoption_data
7. Create `packages/mcp-server/tools/quality.ts` — get_quality_metrics + poll_quality_data
8. Create `packages/mcp-server/tools/governance.ts` — get_governance_summary + poll_governance_data

**Tests (write first):**
- `tests/integration/mcp-tools.test.ts`:
  - All 10 tools registered (5 model-facing + 5 app-only)
  - Each model-facing tool returns text content + structuredContent
  - structuredContent validates against Zod schemas (contract test)
  - App-only tools have correct visibility metadata
  - Filter params work, invalid params return structured error
  - Text summaries contain key numbers (non-empty, includes dollar amounts)

**Definition of done:** MCP server starts. All tools return valid text + structured data. Tests pass.

---

## M10: MCP App UIs — Impact + Spend

**Objective:** Interactive App UIs for Claude Desktop / MCP App-capable clients.

**Tasks:**
1. Set up Vite 7 build for single-file HTML (`packages/mcp-server/vite.config.ts` + `build-apps.ts`, using `vite-plugin-singlefile`)
2. Create `packages/mcp-server/apps/impact/` — Impact App UI:
   - Uses `@modelcontextprotocol/ext-apps/react` (`useApp`, `useHostStyles`)
   - Receives structuredContent via `app.ontoolresult`
   - Renders MetricCards + sparklines
   - Filter controls for date range, team
   - Calls `poll_impact_data` on filter change
3. Create `packages/mcp-server/apps/spend/` — Spend App UI:
   - Spend over time chart + budget utilization + model donut
   - Filter controls
   - Calls `poll_spend_data` on filter change
4. Register App resources in server.ts

**Tests:**
- Build produces valid single-file HTML for each app
- Manual verification: connect to Claude Desktop, invoke tool, interact with App UI

**Definition of done:** `npm run build:mcp` produces working single-file HTML apps. Tools return structuredContent with correct resource URIs.

---

## M11: AI Integration Callout (FR-6)

**Objective:** Dismissible MCP promotion banner on all dashboard pages.

**Tasks:**
1. Create `packages/web/src/components/layout/ai-callout.tsx`
2. Add to dashboard layout (shows on all pages)
3. Dismiss state persisted in localStorage

**Tests:**
- Banner renders with correct copy
- Clicking dismiss hides banner
- Banner stays hidden after page reload (localStorage)

**Definition of done:** Banner visible on all pages, dismissible, persists.

---

## M12: Polish + CI Green

**Objective:** Everything clean, consistent, and passing.

**Tasks:**
1. Fix any remaining lint/typecheck errors
2. Fix any failing tests
3. Ensure `npm run build` produces working artifacts
4. Verify web dashboard end-to-end: navigate all pages, change filters
5. Verify MCP server: connect to Claude Desktop, invoke each tool
6. Review coverage report — ensure minimums met
7. Clean up any TODO/FIXME comments
8. Verify CI pipeline runs green

**Definition of done:** `npm run typecheck && npm run lint && npm run test && npm run build` all pass. Dashboard and MCP server work end-to-end.

---

## Stretch Milestones

### S1: Adoption & Enablement Page (FR-3)
- Create web page + charts (funnel, DAU/WAU, capability heatmap, "where AI is failing")
- Create MCP App UI
- Tests for page + app

### S2: Quality & Autonomy Page (FR-4)
- Create web page + charts (autonomy distribution, failure modes, p50/p95, revert rate)
- Create MCP App UI
- Tests for page + app

### S3: Governance & Compliance Page (FR-5)
- Simplified: event log table + policy block counts + severity distribution
- Create MCP App UI
- Tests for page + app

### S4: E2E Tests (Playwright)
- Dashboard navigation, filter persistence, data verification
- Tests from testing-spec.md Section 7

### S5: Dark Mode
- Tailwind dark mode toggle
- Chart palette adaptation

---

## Execution Notes

- **TDD order within each milestone:** write tests → run (RED) → implement → run (GREEN) → refactor → run (VERIFY)
- **Agent instructions:** execute one milestone at a time. Do not proceed to M(n+1) until M(n) gates pass.
- **Deviation handling:** if implementation requires deviating from a spec, document as `SPEC_DEVIATION: [reason]` in the code and flag for human review.
- **Shared layer first:** M2–M5 build the shared package. This is the foundation — both web and MCP depend on it. Do not skip to UI work.
