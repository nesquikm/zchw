# Testing Spec: AgentView

## 1. Testing Philosophy

- **Test behavior, not implementation** — assert what the user sees and what the service returns, not internal state or method calls
- **Shared layer is the priority** — mock data generator, services, and utilities are the foundation; if they're wrong, everything is wrong
- **Deterministic by design** — seeded PRNG means no flaky tests from random data
- **Observed vs estimated in tests too** — test that measurement labels are correctly assigned
- **Use the real generator** — service tests use the actual mock generator with a fixed seed, never a hand-crafted mock of the mock. This tests real data flow, not our ability to write fixtures
- **Invariants over spot-checks** — where possible, assert properties that must hold for any seed (totals non-negative, funnels monotonic, p95 ≥ p50), not just specific values for seed 42

## 2. Testing Stack

| Tool                        | Purpose                                              |
| --------------------------- | ---------------------------------------------------- |
| Vitest                      | Test runner, assertions, mocking, coverage           |
| React Testing Library       | Component rendering, user interaction simulation     |
| @testing-library/user-event | Realistic user interactions (clicks, typing)         |
| Playwright                  | E2E browser tests (stretch goal)                     |
| MSW (Mock Service Worker)   | Not needed — services are in-memory, no HTTP to mock |

### Test Environment Controls

- **Freeze time** — all tests use `vi.useFakeTimers()` with a fixed date (`2026-03-01T00:00:00Z`) matching the mock generator's default `now`. This ensures service-layer verification window and trend calculations are deterministic
- **Timezone** — test runner sets `TZ=UTC` to prevent locale-dependent formatting differences
- **Deterministic seed** — default seed `42` for all tests; multi-seed invariant tests use seeds `[42, 123, 999, 7777, 31415]`

## 3. Test Structure

```
tests/
├── unit/
│   ├── shared/
│   │   ├── mock/
│   │   │   └── generator.test.ts
│   │   ├── services/
│   │   │   ├── impact.test.ts
│   │   │   ├── spend.test.ts
│   │   │   ├── adoption.test.ts
│   │   │   ├── quality.test.ts
│   │   │   └── governance.test.ts
│   │   └── utils/
│   │       ├── format.test.ts
│   │       └── calculations.test.ts
│   └── web/
│       ├── components/
│       │   ├── metric-card.test.tsx
│       │   ├── measurement-badge.test.tsx
│       │   ├── sparkline.test.tsx
│       │   ├── ai-callout.test.tsx
│       │   └── filters/
│       │       └── date-range-picker.test.tsx
│       └── pages/
│           └── dashboard-page.test.tsx
├── integration/
│   ├── services.test.ts
│   └── mcp-tools.test.ts
└── e2e/                            # [stretch]
    └── dashboard.spec.ts
```

## 4. Unit Tests — Shared Layer

### 4.1 Mock Data Generator (`generator.test.ts`)

The mock data is the foundation. If it's unrealistic or inconsistent, the entire dashboard is meaningless.

**Determinism:**

- Same seed produces identical output across runs
- Different seeds produce different but valid data

**Data integrity:**

- Every session references a valid userId and teamId
- Every user belongs to an existing team
- Session dates fall within the 90-day range
- No sessions on behalf of users who haven't been invited yet
- `activatedAt` is null only for users who have zero sessions
- `firstOutcomeAt` ≤ first session where `prMerged && ciPassed && !revertedWithin48h`

**Realistic patterns:**

- Weekday sessions outnumber weekend sessions by at least 2x
- Adoption follows an S-curve: fewer active users in early days, more later
- Team variance: at least one team has 3x more sessions per user than the lowest team
- Model cost correlation: higher-cost models have higher success rates
- Autonomy progression: Level 3 sessions are rare in the first 30 days, more common in the last 30

**Volume:**

- Total sessions ≈ 15,000 (±20%)
- Non-agent PRs ≈ 3,000 (±20%)
- All 5 teams have at least some sessions
- All 3 providers and 5 models appear in the data
- Security events ≥ 200 (enough for meaningful severity/time distributions)

**Baseline data (non-agent PRs):**

- Non-agent PRs exist for all 5 teams
- Non-agent `timeToMergeMinutes` is on average slower than agent-assisted (by 20-30%)
- Non-agent `linesAdded` sum is a meaningful fraction of total code (agent + non-agent)

**Edge cases:**

- At least one user is invited but never activated (null `activatedAt`)
- At least one session is `abandoned`
- At least one verified outcome was reverted within 48h
- At least one team is over budget

**Multi-seed invariants (run for seeds [42, 123, 999, 7777, 31415]):**

- No negative durations, costs, or token counts
- `endedAt` ≥ `startedAt` for all completed sessions
- All timestamps fall within the 90-day window
- Every session's userId exists in the user list
- Every user's teamId exists in the team list
- Total sessions > 0 for every seed
- At least 3 task types appear in the data

### 4.2 Services

Each service is tested with the same pattern. **Important boundary:** service tests assert that the _service logic_ is correct (aggregation, filtering, formulas), not that the mock data has certain patterns. Pattern tests (e.g., "autonomy progression," "model cost correlation") belong in `generator.test.ts`. Service tests should pass regardless of which realistic patterns the generator models.

**Input/output contract:**

- Returns correct schema (Zod parse succeeds on output)
- Responds to filter changes (different date range → different numbers)
- Empty filters return full-range data

**Correctness (service logic, not data patterns):**

`impact.test.ts` (validates FR-1, AC-1.1–AC-1.5):

- Cost per verified outcome = total AI spend across ALL sessions in the period / count of verified outcomes (fully-loaded: includes failed, abandoned, in-progress session costs)
- Value-to-cost ratio inputs are transparent (hourlyRate, estimatedHoursSaved, totalSpend all present and > 0)
- Cycle time delta uses non-agent PRs as baseline: `(agentMedian - baselineMedian) / baselineMedian`
- Agent contribution % = agent lines / (agent + non-agent lines), between 0 and 100
- Active users ≤ total seats
- Verified outcomes excludes PRs in 48h verification window (sessions with `prMergedAt` within 48h of `now`)
- Sparklines adapt to date range: 7d → 7 points, 30d → 30 points, 90d → 30 bucketed points
- Sparklines for ratio metrics use `null` for zero-denominator buckets
- Measurement types: costPerVerifiedOutcome = 'observed', valueToCostRatio = 'estimated'
- Trend values compare against previous period of equal length; `null` when no previous data

`spend.test.ts` (validates FR-2, AC-2.1–AC-2.5):

- Total spend equals sum of all session costs in the filtered range
- Spend by team sums to total spend (within floating-point tolerance)
- Spend by model sums to total spend
- Budget utilization is pro-rated: `teamSpend / (monthlyBudget × daysInRange / daysInMonth)`
- Linear projection ≥ spend so far (can't project less than already spent)
- At least one team flagged as approaching/exceeding budget (tests against pro-rated threshold)

`adoption.test.ts` (validates FR-3, AC-3.1–AC-3.4):

- Funnel is monotonically decreasing: invited ≥ activated ≥ first outcome ≥ regular
- Time-to-value > 0 for users who have outcomes
- DAU ≤ WAU for any given week
- Capability adoption percentages sum to 100%
- "Where AI is failing" surfaces teams with below-average success rate

`quality.test.ts` (validates FR-4, AC-4.1–AC-4.5):

- Verified success rate is between 0 and 1 (denominator = completed + failed sessions only, excludes abandoned and active)
- Verified success rate excludes sessions in 48h verification window from both numerator and denominator
- Autonomy distribution percentages sum to 100%
- Intervention rate ≥ 0
- Revert rate is between 0 and 1 (denominator = verified + reverted outcomes, per requirements §3)
- Failure mode percentages sum to 100% of failed sessions
- p95 completion time ≥ p50

`governance.test.ts` (validates FR-5, AC-5.1–AC-5.3):

- Block rate + override rate ≤ total policy events
- Sensitive data blocked + allowed = total sensitive data events
- Event log entries are sorted by timestamp descending
- Severity distribution covers all severity levels present in data

**Filter behavior:**

- Filtering by a single team returns only that team's data
- Filtering by date range excludes sessions outside the range
- Filtering by model only includes sessions using that model
- Combining filters (team + model + date) works correctly
- Empty result is handled (e.g., filter for a team that doesn't use a specific model)

**Empty and edge-case data handling:**

- Date range with no sessions returns zero totals and empty arrays (no crash)
- Single-day date range returns valid data
- Filter for a non-existent team ID returns empty result with correct shape
- Date range `from > to` throws `InvalidFilterError` (per tech spec §10 Error Handling)

**Multi-seed service invariants (run for seeds [42, 123, 999, 7777, 31415]):**

- All totals are non-negative
- Funnel is monotonically decreasing for any seed
- p95 ≥ p50 for any seed
- Spend by team sums to total spend (within floating-point tolerance)
- Cross-service consistency holds: Impact `totalSpend` = Spend total for any seed

### 4.3 Utilities

`format.test.ts`:

- `formatCurrency(1234.5)` → `"$1,234.50"`
- `formatCurrency(1234567)` → `"$1.23M"` (abbreviation for large numbers)
- `formatPercent(0.885)` → `"88.5%"`
- `formatDuration(125)` → `"2h 5m"` (input is minutes, matching schema's `durationMinutes`/`p50Minutes`)
- `formatNumber(15234)` → `"15,234"`
- `formatTrend(0.12)` → `"+12%"` with up indicator
- `formatTrend(-0.05)` → `"-5%"` with down indicator
- `formatTrend(null)` → `"N/A"` or `"—"` (no previous period data)
- `formatTrend(0)` → `"0%"` with neutral indicator
- Edge cases: very large numbers, NaN → graceful handling

`calculations.test.ts`:

- `calculateTrend(current, previous)` → correct percentage change
- `calculateTrend(100, 0)` → handles division by zero
- `projectMonthEnd(dailySpend, today)` → returns number ≥ sum of dailySpend
- `projectMonthEnd` with 0 remaining days → returns sum of dailySpend exactly
- `calculateCycleTimeDelta(agentMedian, baselineMedian)` → correct percentage

## 5. Unit Tests — Web Components

### 5.1 MetricCard (`metric-card.test.tsx`) (validates FR-1 AC-1.1–AC-1.3, FR-9 AC-9.3)

- Renders value, label, and trend
- Shows up arrow and green color for positive trend
- Shows down arrow and red color for negative trend
- Displays "Observed" badge when `measurement='observed'`
- Displays "Estimated" badge when `measurement='estimated'`
- Renders sparkline when sparkline data is provided
- Handles missing/null values gracefully

### 5.2 MeasurementBadge (`measurement-badge.test.tsx`)

- Renders "Observed" with appropriate styling
- Renders "Estimated" with appropriate styling
- Shows tooltip on hover explaining what observed/estimated means

### 5.3 Sparkline (`sparkline.test.tsx`)

- Renders an SVG with the correct number of points
- Handles empty data array
- Handles single data point
- Handles `null` values in data array (ratio metrics may have null for zero-denominator buckets) — renders gap or interpolates

### 5.4 DateRangePicker (`date-range-picker.test.tsx`) (validates FR-7, AC-7.1–AC-7.2)

- Renders preset options (7d, 30d, 90d, custom)
- Clicking a preset calls onChange with correct date range
- Custom range shows date inputs
- Validates that "from" is before "to"

### 5.5 AI Integration Callout (`ai-callout.test.tsx`) (validates FR-6, AC-6.1–AC-6.3)

- Banner renders with correct MCP promotion copy
- Clicking dismiss hides the banner
- Banner remains hidden after component remount (localStorage persistence)
- Banner is visible by default when localStorage has no dismiss state

### 5.6 Loading and Error States

- Components show skeleton/loading state when data is undefined
- Components show error callout when data fetch fails
- Components show "No data for this period" when filters return empty results
- Error state includes a retry action

### 5.7 Dashboard Page Integration (`dashboard-page.test.tsx`) (validates FR-1 AC-1.1/AC-1.4, FR-7 AC-7.1–AC-7.4, FR-9 AC-9.1–AC-9.2)

Mount a real route with TanStack Router + Query context:

- Page renders metric cards with data from the real service (fixed seed)
- Changing date range filter updates URL search params
- URL search params are read on mount and applied to filters
- Loading a URL with `?range=7d&teams=platform` pre-selects correct filters and shows filtered data
- Clicking sidebar nav links navigates without full page reload (AC-7.4)
- Data range label is visible showing the active filter period (AC-9.1)
- Loading state shows skeleton placeholders before data arrives (AC-9.2)

## 6. Integration Tests

### 6.1 Services End-to-End (`services.test.ts`)

Tests that all services work together with the same mock dataset:

- All services return valid data with default filters
- Metrics are consistent across services:
  - Impact Summary's `verifiedOutcomes` is consistent with Quality's `verifiedSuccessRate` (i.e., `verifiedOutcomes ≈ verifiedSuccessRate × completedSessionCount` within rounding tolerance)
  - Impact Summary's `totalSpend` matches Spend's total
  - Impact Summary's \`activeUsers\` ≥ max DAU in Adoption's \`activeUsersOverTime\` (period-wide distinct users must be ≥ any single day's count)
- Changing the seed produces different but still valid/consistent data

### 6.2 MCP Tools (`mcp-tools.test.ts`) (validates FR-8, AC-8.1–AC-8.5)

Tests MCP tool registration and invocation:

- All 11 tools are registered (6 model-facing + 5 app-only)
- Each model-facing tool returns both `content` (text) and `structuredContent`
- Text content is non-empty and contains key numbers
- structuredContent matches the expected Zod schema
- App-only tools have correct visibility metadata
- Tools accept filter parameters and return filtered data
- Tools handle invalid/missing parameters gracefully (Zod validation errors return structured error, not stack trace)
- Invalid date range returns error, not crash
- Missing optional params default correctly
- structuredContent uses the same Zod schemas as the web dashboard (contract test — shared types enforce consistency between both consumers)

## 7. E2E Tests (Stretch Goal)

### 7.1 Dashboard Navigation (`dashboard.spec.ts`)

Using Playwright against the built web dashboard:

**Test 1: Impact Summary loads with data**

1. Navigate to `/dashboard`
2. Verify 6 metric cards are visible
3. Verify at least one shows "Observed" badge
4. Verify sparklines are rendered (SVG elements exist)

**Test 2: Navigate between pages**

1. Start at `/dashboard`
2. Click "Spend" in sidebar
3. Verify URL changed to `/dashboard/spend`
4. Verify spend charts are visible

**Test 3: Filters update data**

1. Navigate to `/dashboard/spend`
2. Change date range from 30d to 7d
3. Verify URL contains `range=7d`
4. Verify total spend number decreased (7 days < 30 days)

**Test 4: Filters persist in URL**

1. Navigate to `/dashboard/spend?range=90d&teams=platform`
2. Verify date range picker shows 90d selected
3. Verify team filter shows "Platform" selected
4. Verify charts show Platform-only data

**Test 5: AI Integration Callout**

1. Navigate to `/dashboard`
2. Verify MCP callout banner is visible
3. Click dismiss
4. Verify banner is hidden

## 8. Coverage Goals

Targets are aspirational — quality of assertions matters more than hitting a number. High coverage with shallow assertions is worse than moderate coverage with meaningful invariants.

| Layer           | Target | Minimum | Rationale                                                           |
| --------------- | ------ | ------- | ------------------------------------------------------------------- |
| Shared services | ≥90%   | 80%     | Core logic, shared by both interfaces. Highest priority             |
| Shared utils    | ≥95%   | 90%     | Pure functions, easy to test exhaustively                           |
| Mock generator  | ≥80%   | 70%     | Invariants and constraints, not every random branch                 |
| Web components  | ≥60%   | 50%     | Key components + one page integration test. Don't chase UI coverage |
| MCP tools       | ≥80%   | 70%     | Table-driven contract tests across all tools                        |
| Overall         | ≥75%   | 65%     | Meaningful coverage, not vanity metrics                             |

Coverage is measured with Vitest's built-in c8/istanbul coverage provider.

Priority if time is short: shared services > MCP tools > mock generator > page integration > components.

## 9. What We Don't Test

- **Visual regression** — no screenshot comparison (would need a baseline and is fragile)
- **Recharts internals** — we test that data is passed correctly, not that Recharts renders pixels
- **MCP App UI rendering** — iframe-based UIs are hard to test in Vitest; we test the tools and data flow instead. Visual verification of App UIs is deferred to E2E/Playwright (stretch goal S4) or manual testing
- **Performance benchmarks** — not meaningful with mock data
- **Accessibility compliance** — manual check, not automated (would be future work with axe-core)

## 10. TDD Workflow

For each feature, the development order is:

1. **Write the Zod schema** (types/) — this is the contract
2. **Write the service test** — assert expected behavior against the schema
3. **Implement the service** — make tests pass
4. **Write the component test** — assert rendering with known data
5. **Implement the component** — make tests pass
6. **Integration test** — verify services + components work together

This ensures tests are written before implementation, not as an afterthought.
