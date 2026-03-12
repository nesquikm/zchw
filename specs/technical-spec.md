# Technical Implementation Spec: AgentView

## 1. Architecture Overview

AgentView is a monorepo with two interfaces sharing a common data layer:

```
┌─────────────────────────────────────────────────┐
│              Shared Data Layer                   │
│   types/   — Zod schemas + derived TS types     │
│   mock/    — seeded deterministic data generator │
│   services/— query/aggregation functions         │
│   utils/   — formatters, calculations            │
└────────────┬──────────────────┬──────────────────┘
             │                  │
    ┌────────▼────────┐  ┌─────▼───────────────┐
    │  Web Dashboard  │  │    MCP Server        │
    │  Vite + React   │  │  @mcp/sdk + tools    │
    │  TanStack Router│  │  MCP App UIs (React) │
    │  TanStack Query │  │  vite-plugin-singlefile│
    │  shadcn/ui      │  │  stdio / HTTP        │
    │  Recharts       │  │  Recharts            │
    │  localhost:5173  │  │                      │
    └─────────────────┘  └──────────────────────┘
```

Both interfaces call the same service functions. The web dashboard calls them directly (in-browser, wrapped in TanStack Query for loading states). The MCP server calls them from tool handlers and returns text + structuredContent.

## 2. Tech Stack

| Layer           | Choice                                   | Rationale                                                                                                                                    |
| --------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Language        | TypeScript 5 (strict)                    | Zencoder's stack; type safety across shared layer                                                                                            |
| Web framework   | Vite 7 + React 19                        | Fast dev, no SSR needed, consistent with MCP App UIs                                                                                         |
| UI components   | shadcn/ui + Tailwind CSS 4               | Production polish with minimal effort, composable. Tailwind v4 uses CSS-first config (`@tailwindcss/vite` plugin, no `tailwind.config.ts`)   |
| Charts          | Recharts 3                               | React-native, composable, good TS support. Used in both web and MCP App UIs for consistency                                                  |
| Routing         | TanStack Router                          | End-to-end type-safe params/search params, built-in Zod validation for URL filters                                                           |
| Server state    | TanStack Query v5                        | Caching, loading states, refetch on filter change                                                                                            |
| URL state       | TanStack Router search params            | Bookmarkable/shareable filter state with type safety                                                                                         |
| Validation      | Zod 4                                    | Shared schemas for types, API contracts, URL params. MCP SDK ^1.27.1 supports Zod 4 natively                                                 |
| MCP SDK         | @modelcontextprotocol/sdk (^1.27.1)      | MCP server implementation. Uses `server.registerTool()` (not deprecated `server.tool()`)                                                     |
| MCP Apps        | @modelcontextprotocol/ext-apps (^1.2.2)  | MCP App extension for rich UI in MCP clients. Server: `registerAppTool`, `registerAppResource`. Client: `App` class + React hooks (`useApp`) |
| MCP App build   | Vite 7 + vite-plugin-singlefile (^2.3.0) | Bundles each App UI into one HTML file                                                                                                       |
| Unit tests      | Vitest 4 + React Testing Library         | Fast, TS-native, behavior-focused                                                                                                            |
| E2E tests       | Playwright (stretch)                     | Browser-based acceptance tests                                                                                                               |
| CI              | GitHub Actions                           | Lint + typecheck + test on push                                                                                                              |
| Package manager | npm workspaces                           | Simple monorepo, no Turborepo overhead                                                                                                       |

## 3. Project Structure

```
agentview/
├── package.json                    # Workspace root
├── tsconfig.json                   # Base TS config
├── vitest.config.ts                # Shared test config
├── vitest.workspace.ts             # Workspace test config
├── .github/
│   └── workflows/
│       └── ci.yml                  # Lint + typecheck + test
│
├── specs/                          # Spec-driven artifacts
│   ├── assignment.md
│   ├── requirements.md
│   ├── technical-spec.md
│   ├── testing-spec.md
│   └── plan.md
│
├── packages/
│   ├── shared/                     # Shared data layer
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts            # Public API barrel export
│   │       ├── types/
│   │       │   ├── organization.ts # Org, Team, User schemas
│   │       │   ├── session.ts      # AgentSession, NonAgentPR, autonomy levels
│   │       │   ├── metrics.ts      # Response schemas: Impact, Spend, Adoption, Quality, Governance + sub-schemas
│   │       │   ├── security.ts     # SecurityEvent, SecurityEventType
│   │       │   ├── filters.ts      # DateRange, Filters schemas
│   │       │   └── index.ts
│   │       ├── mock/
│   │       │   ├── seed.ts         # Deterministic PRNG (mulberry32)
│   │       │   ├── generator.ts    # Orchestrates all generators
│   │       │   ├── organizations.ts# Generates org + teams
│   │       │   ├── users.ts        # Generates users with activation dates
│   │       │   ├── sessions.ts     # Generates 90 days of sessions
│   │       │   ├── security.ts     # Generates security events
│   │       │   ├── baseline.ts    # Generates non-agent PRs (baseline)
│   │       │   └── index.ts        # Exports generated dataset
│   │       ├── services/
│   │       │   ├── impact.ts       # Impact Summary aggregations
│   │       │   ├── spend.ts        # Spend & Forecasting queries
│   │       │   ├── adoption.ts     # Adoption & Enablement queries
│   │       │   ├── quality.ts      # Quality & Autonomy queries
│   │       │   ├── governance.ts   # Governance & Compliance queries
│   │       │   └── index.ts
│   │       └── utils/
│   │           ├── format.ts       # Number, currency, date, duration
│   │           ├── calculations.ts # ROI, trends, deltas, projections
│   │           └── index.ts
│   │
│   ├── web/                        # Web Dashboard
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts          # includes @tailwindcss/vite plugin
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx            # Entry point
│   │       ├── router.ts           # TanStack Router config
│   │       ├── routes/
│   │       │   ├── __root.tsx      # Root layout: sidebar + header + filters
│   │       │   ├── index.tsx       # Redirect to /dashboard
│   │       │   ├── dashboard.tsx   # Dashboard layout (shared filters)
│   │       │   ├── dashboard/
│   │       │   │   ├── index.tsx         # Impact Summary (FR-1)
│   │       │   │   ├── spend.tsx         # Spend & Forecasting (FR-2)
│   │       │   │   ├── adoption.tsx      # Adoption & Enablement (FR-3) [stretch]
│   │       │   │   ├── quality.tsx       # Quality & Autonomy (FR-4) [stretch]
│   │       │   │   └── governance.tsx    # Governance (FR-5) [stretch]
│   │       ├── components/
│   │       │   ├── layout/
│   │       │   │   ├── sidebar.tsx       # Navigation sidebar
│   │       │   │   ├── header.tsx        # Top bar: org name, date display
│   │       │   │   └── ai-callout.tsx    # MCP integration banner (FR-6)
│   │       │   ├── charts/
│   │       │   │   ├── spend-over-time.tsx    # Area chart
│   │       │   │   ├── budget-utilization.tsx # Horizontal bar + threshold
│   │       │   │   ├── cost-drivers.tsx       # Sorted bar chart
│   │       │   │   ├── model-comparison.tsx   # Donut + table
│   │       │   │   ├── adoption-funnel.tsx    # Funnel visualization
│   │       │   │   ├── autonomy-distribution.tsx # Stacked bar
│   │       │   │   ├── failure-modes.tsx      # Horizontal bar
│   │       │   │   └── sparkline.tsx          # Inline trend line
│   │       │   ├── metrics/
│   │       │   │   ├── metric-card.tsx        # KPI: value + trend + sparkline
│   │       │   │   └── measurement-badge.tsx  # "Observed" / "Estimated" indicator
│   │       │   ├── filters/
│   │       │   │   ├── date-range-picker.tsx
│   │       │   │   ├── team-filter.tsx
│   │       │   │   └── model-filter.tsx
│   │       │   └── ui/                  # shadcn/ui components (generated)
│   │       ├── hooks/
│   │       │   └── use-analytics.ts     # TanStack Query hooks wrapping services
│   │       └── lib/
│   │           └── query-client.ts      # TanStack Query client config
│   │
│   └── mcp-server/                 # MCP Server + App UIs
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsconfig.server.json    # Server-only TS config (Node target)
│       ├── vite.config.ts          # Builds App UIs into single HTML files
│       ├── main.ts                 # Entry point: stdio + HTTP transport
│       ├── server.ts               # Creates McpServer, registers tools + resources
│       ├── tools/
│       │   ├── impact.ts           # get_impact_summary tool
│       │   ├── spend.ts            # get_spend_breakdown tool
│       │   ├── adoption.ts         # get_adoption_metrics tool
│       │   ├── quality.ts          # get_quality_metrics tool
│       │   └── governance.ts       # get_governance_summary tool
│       ├── formatters/
│       │   └── text.ts             # Formats structured data as readable text summaries
│       └── apps/                   # MCP App UIs (one per tool)
│           ├── impact/
│           │   ├── mcp-app.html    # HTML shell
│           │   └── src/
│           │       ├── mcp-app.tsx # React app: KPI cards + sparklines
│           │       └── mcp-app.css
│           ├── spend/
│           │   ├── mcp-app.html
│           │   └── src/
│           │       ├── mcp-app.tsx # React app: spend charts + filters
│           │       └── mcp-app.css
│           ├── adoption/           # [stretch]
│           │   ├── mcp-app.html
│           │   └── src/
│           │       ├── mcp-app.tsx
│           │       └── mcp-app.css
│           ├── quality/            # [stretch]
│           │   ├── mcp-app.html
│           │   └── src/
│           │       ├── mcp-app.tsx
│           │       └── mcp-app.css
│           └── governance/         # [stretch]
│               ├── mcp-app.html
│               └── src/
│                   ├── mcp-app.tsx
│                   └── mcp-app.css
│
└── tests/
    ├── unit/
    │   ├── shared/
    │   │   ├── mock/
    │   │   │   └── generator.test.ts     # Mock data correctness + patterns
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
    │   ├── services.test.ts              # End-to-end service queries
    │   └── mcp-tools.test.ts             # MCP tool invocation tests
    └── e2e/                              # [stretch]
        └── dashboard.spec.ts             # Playwright: navigate, filter, verify
```

## 4. Data Model

All types defined as Zod schemas in `packages/shared/src/types/`. TypeScript types derived via `z.infer<>`.

### Organization & Teams

```typescript
const TeamSchema = z.object({
  id: z.string(),
  name: z.string(), // "Platform", "Mobile", "Backend", "Frontend", "Data"
  department: z.string(), // "Engineering"
  memberCount: z.number(),
  monthlyBudget: z.number(), // USD
});

const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string(), // "Acme Corp"
  plan: z.enum(['starter', 'professional', 'enterprise']),
  totalSeats: z.number(), // 50
  teams: z.array(TeamSchema),
});
```

### Users

```typescript
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  teamId: z.string(),
  role: z.enum(['engineer', 'senior_engineer', 'staff_engineer', 'lead', 'manager']),
  invitedAt: z.string(), // ISO date — when they got access
  activatedAt: z.string().nullable(), // null = invited but never used
  firstOutcomeAt: z.string().nullable(), // null = never produced a verified outcome
  lastActiveAt: z.string().nullable(),
});
```

### Agent Sessions

```typescript
const AutonomyLevelSchema = z.enum(['guided', 'supervised', 'autonomous']);

const SessionStatusSchema = z.enum(['active', 'completed', 'failed', 'abandoned']);

const TaskTypeSchema = z.enum([
  'code_generation',
  'code_review',
  'test_writing',
  'debugging',
  'documentation',
  'refactoring',
]);

const FailureModeSchema = z.enum([
  'none',
  'agent_error',
  'infra_issue',
  'policy_block',
  'test_failure',
  'human_abandoned',
]);

const AgentSessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  teamId: z.string(),
  repositoryId: z.string(),
  startedAt: z.string(), // ISO datetime
  endedAt: z.string().nullable(),
  status: SessionStatusSchema,
  taskType: TaskTypeSchema,
  autonomyLevel: AutonomyLevelSchema,
  provider: z.string(), // 'anthropic', 'openai', 'google'
  model: z.string(), // 'claude-sonnet-4-5', 'gpt-4o', 'gemini-2.0-flash'
  promptTokens: z.number(),
  completionTokens: z.number(),
  estimatedCostUSD: z.number(),
  interventionCount: z.number(), // human corrections during session
  failureMode: FailureModeSchema,
  // PR outcome: at most one PR per session for MVP. Requirements note sessions
  // can produce 0+ PRs; this 1:1 simplification is sufficient for mock data and
  // avoids a join table. Production would use a separate PullRequest entity
  // linked via sessionId. Fields are null/false if session didn't produce a PR.
  prOpened: z.boolean(),
  prMerged: z.boolean(),
  ciPassed: z.boolean().nullable(), // null if no CI run
  revertedWithin48h: z.boolean(),
  prMergedAt: z.string().nullable(), // ISO datetime when PR was merged; null if not merged
  // Verification status is derived by the service layer, not stored:
  //   pending  = prMerged && now - prMergedAt < 48h && !revertedWithin48h
  //   verified = prMerged && ciPassed && now - prMergedAt >= 48h && !revertedWithin48h
  //   failed   = !prMerged || !ciPassed || revertedWithin48h
  // "Verified outcomes" metrics exclude pending PRs. See requirements §3 "Verification window".
  linesAdded: z.number(),
  linesDeleted: z.number(),
  durationMinutes: z.number(),
  estimatedTimeSavedMinutes: z.number(), // estimated, labeled as such
  // Computed as: taskTypeBaselineMinutes × (1 - agentSpeedupFactor).
  // Baseline minutes per task type: code_generation=120, code_review=45, test_writing=90,
  // debugging=60, documentation=30, refactoring=90. Speedup factor varies by autonomy level
  // and model quality (0.3–0.7). Explicitly labeled "estimated" in all UI surfaces.
  // For cycle time comparison
  timeToMergeMinutes: z.number().nullable(), // null if not merged
});
```

### Security Events

```typescript
const SecurityEventTypeSchema = z.enum([
  'policy_block',
  'policy_override',
  'sensitive_data_blocked',
  'sensitive_data_allowed',
  'shell_command',
  'external_api_call',
  'file_modification',
]);

const SecurityEventSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  userId: z.string(),
  sessionId: z.string(),
  eventType: SecurityEventTypeSchema,
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string(),
  policyId: z.string().nullable(), // which policy was triggered
  repository: z.string(),
});
```

### Non-Agent PRs (baseline data)

For computing cycle time delta and agent contribution %, the mock dataset includes non-agent PRs — code merged without any agent involvement. These provide the baseline.

```typescript
const NonAgentPRSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  repository: z.string(),
  mergedAt: z.string(), // ISO datetime
  linesAdded: z.number(),
  linesDeleted: z.number(),
  timeToMergeMinutes: z.number(), // for cycle time baseline
});
```

The mock generator produces ~3,000 non-agent PRs over 90 days (roughly 1/5 of agent session volume), distributed across teams proportionally. These are used only for:

- **Cycle time delta**: median agent `timeToMergeMinutes` vs. median non-agent `timeToMergeMinutes`
- **Agent contribution %**: agent `linesAdded` / (agent `linesAdded` + non-agent `linesAdded`)

### Filter Parameters (shared by web + MCP)

```typescript
const DateRangeSchema = z.object({
  from: z.string(), // ISO date
  to: z.string(),
});

const FiltersSchema = z.object({
  dateRange: DateRangeSchema,
  teamIds: z.array(z.string()).optional(),
  models: z.array(z.string()).optional(),
  providers: z.array(z.string()).optional(),
});

// MCP tools use a relaxed version where dateRange is optional (defaults to full 90-day range).
// LLMs may omit dateRange; the tool handler fills in the default before calling the service.
const McpFiltersSchema = FiltersSchema.extend({
  dateRange: DateRangeSchema.optional(),
});
```

### Service Response Types

Each service returns a typed response. Example for Impact Summary:

```typescript
// Trend type: decimal ratio representing % change vs previous period of equal length.
// e.g., 0.12 means +12%, -0.05 means -5%. Formatted by formatTrend() for display.
// null when previous period has no data (see requirements §3 "Previous period").
const TrendSchema = z.number().nullable();

const ImpactSummarySchema = z.object({
  costPerVerifiedOutcome: z.number(), // USD
  costPerVerifiedOutcomeTrend: TrendSchema,
  valueToCostRatio: z.number(), // e.g. 4.2
  valueToCostRatioTrend: TrendSchema,
  valueToCostRatioInputs: z.object({
    // transparent assumptions
    hourlyRate: z.number(),
    estimatedHoursSaved: z.number(),
    totalSpend: z.number(),
  }),
  cycleTimeDeltaPercent: z.number(), // e.g. -23 means 23% faster
  cycleTimeDeltaTrend: TrendSchema, // trend of the delta itself
  agentContributionPercent: z.number(), // e.g. 34.5
  agentContributionTrend: TrendSchema,
  activeUsers: z.number(), // distinct users with ≥1 session in the period
  totalSeats: z.number(),
  adoptionPercent: z.number(),
  adoptionTrend: TrendSchema,
  totalSpend: z.number(), // USD — total AI spend in period (source of truth for cross-service consistency with SpendBreakdown)
  verifiedOutcomes: z.number(),
  verifiedOutcomesTrend: TrendSchema,
  periodLabel: z.string(), // "Feb 1 – Feb 28, 2026"
  sparklines: z.object({
    // Up to 30 data points, adaptive to date range:
    //   ≤30 days → 1 point/day
    //   >30 days → bucketed into 30 equal intervals
    // For ratio metrics (costPerOutcome), buckets with
    // zero denominators use null (rendered as gaps).
    costPerOutcome: z.array(z.number().nullable()),
    valueToCost: z.array(z.number().nullable()),
    cycleTimeDelta: z.array(z.number().nullable()),
    agentContribution: z.array(z.number().nullable()),
    activeUsers: z.array(z.number()),
    verifiedOutcomes: z.array(z.number()),
  }),
  measurementTypes: z.record(z.enum(['observed', 'estimated'])),
});
```

### Spend Breakdown Response

```typescript
const TeamSpendSchema = z.object({
  teamId: z.string(),
  teamName: z.string(),
  spend: z.number(),
  monthlyBudget: z.number(),
  proRatedBudget: z.number(), // budget × daysInRange / daysInMonth
  utilizationPercent: z.number(), // spend / proRatedBudget × 100
  status: z.enum(['normal', 'approaching', 'exceeding']), // >80% approaching, >100% exceeding
  costPerOutcome: z.number().nullable(), // null if no verified outcomes
});

const ModelSpendSchema = z.object({
  model: z.string(),
  provider: z.string(),
  spend: z.number(),
  spendPercent: z.number(),
  sessionCount: z.number(),
  successRate: z.number(), // verified outcomes / completed sessions (same denominator as Quality's verifiedSuccessRate)
  costPerOutcome: z.number().nullable(),
});

const SpendBreakdownSchema = z.object({
  totalSpend: z.number(),
  totalSpendTrend: TrendSchema,
  projectedMonthEnd: z.number(),
  burnRateDaily: z.number(),
  spendByDay: z.array(z.object({ date: z.string(), spend: z.number() })),
  spendByTeam: z.array(TeamSpendSchema),
  spendByModel: z.array(ModelSpendSchema),
  costDrivers: z.array(
    z.object({
      // top spend categories
      category: z.string(), // team name, model name, or task type
      type: z.enum(['team', 'model', 'taskType']),
      spend: z.number(),
      spendPercent: z.number(),
    }),
  ),
  periodLabel: z.string(),
  measurementTypes: z.record(z.enum(['observed', 'estimated'])),
});
```

### Adoption Metrics Response

```typescript
const AdoptionMetricsSchema = z.object({
  funnel: z.object({
    invited: z.number(),
    activated: z.number(), // at least 1 session
    firstOutcome: z.number(), // at least 1 verified outcome
    regular: z.number(), // ≥3 sessions/week
  }),
  timeToValueMedianDays: z.number().nullable(), // null if no users reached first outcome
  activeUsersOverTime: z.array(
    z.object({
      date: z.string(),
      dau: z.number(),
      wau: z.number(),
    }),
  ),
  capabilityAdoption: z.array(
    z.object({
      taskType: z.string(), // from TaskTypeSchema
      sessionCount: z.number(),
      percent: z.number(),
    }),
  ),
  teamUsage: z.array(
    z.object({
      teamId: z.string(),
      teamName: z.string(),
      sessionsPerUserPerWeek: z.number(),
      successRate: z.number(),
      isFailingHighlight: z.boolean(), // below-average success rate
    }),
  ),
  periodLabel: z.string(),
  measurementTypes: z.record(z.enum(['observed', 'estimated'])),
});
```

### Quality Metrics Response

```typescript
const QualityMetricsSchema = z.object({
  verifiedSuccessRate: z.number(), // 0–1
  verifiedSuccessRateTrend: TrendSchema,
  autonomyDistribution: z.object({
    guided: z.number(), // percentage (sums to 100)
    supervised: z.number(),
    autonomous: z.number(),
  }),
  interventionRate: z.number(), // avg interventions per session
  interventionRateTrend: TrendSchema,
  revertRate: z.number(), // 0–1, reverted / (verified + reverted). See requirements §3 "Revert"
  revertRateTrend: TrendSchema,
  failureModes: z.array(
    z.object({
      mode: z.string(), // from FailureModeSchema (excluding 'none')
      count: z.number(),
      percent: z.number(),
    }),
  ),
  completionTime: z.object({
    p50Minutes: z.number(),
    p95Minutes: z.number(),
  }),
  periodLabel: z.string(),
  measurementTypes: z.record(z.enum(['observed', 'estimated'])),
});
```

### Governance Metrics Response

```typescript
const GovernanceMetricsSchema = z.object({
  policyBlockRate: z.number(), // 0–1
  policyOverrideRate: z.number(), // 0–1
  topViolatedPolicies: z.array(
    z.object({
      policyId: z.string(),
      description: z.string(),
      count: z.number(),
      trend: TrendSchema,
    }),
  ),
  sensitiveData: z.object({
    blocked: z.number(),
    allowed: z.number(),
    total: z.number(),
  }),
  accessScope: z.array(
    z.object({
      repository: z.string(),
      sessionCount: z.number(),
      eventCount: z.number(),
    }),
  ),
  eventLog: z.array(
    z.object({
      // sorted by timestamp descending
      id: z.string(),
      timestamp: z.string(),
      userId: z.string(),
      eventType: z.string(),
      severity: z.string(),
      description: z.string(),
      repository: z.string(),
    }),
  ),
  severityOverTime: z.array(
    z.object({
      date: z.string(),
      low: z.number(),
      medium: z.number(),
      high: z.number(),
      critical: z.number(),
    }),
  ),
  periodLabel: z.string(),
  measurementTypes: z.record(z.enum(['observed', 'estimated'])),
});
```

## 5. Mock Data Generator

Located in `packages/shared/src/mock/`.

### Seeded PRNG

All randomness uses a seeded mulberry32 generator:

```typescript
function createRng(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

Default seed: `42`. Tests use the same seed for deterministic assertions. Changing the seed produces a different but equally realistic dataset.

### Time Anchoring

The generator accepts a `now` parameter (default: `2026-03-01T00:00:00Z`). The 90-day window runs from `now - 90 days` to `now`. This matters for:

- **Verification window**: sessions with `prMergedAt` within 48 hours of `now` are in pending verification status (excluded from verified outcome counts by the service layer)
- **"Previous period"** calculations: trends compare the selected range against the equal-length window immediately before it
- **Tests**: use `vi.useFakeTimers()` set to the same `now` value to ensure service-layer date logic is deterministic

### Realistic Patterns

The generator models real-world behavior:

| Pattern                | Implementation                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------- |
| Weekday > weekend      | 3-5x more sessions on weekdays                                                         |
| S-curve adoption       | `1 / (1 + e^(-k(t - t0)))` for user activation over 90 days                            |
| Team variance          | Platform: power users (8 sessions/user/day). Data: barely adopted (1 session/user/day) |
| Model quality tradeoff | Claude Sonnet: $0.08/session avg, 88% success. GPT-4o mini: $0.02/session, 71% success |
| Autonomy progression   | Early days: mostly Level 1. By day 90: 40% Level 2, 15% Level 3                        |
| Error rate by model    | Cheaper models have higher error rates                                                 |
| Time-of-day patterns   | Peak 10am-4pm, low overnight                                                           |
| Cycle time improvement | Agent-assisted PRs merge 20-30% faster than baseline                                   |

### Data Volume

| Entity          | Count                                                    |
| --------------- | -------------------------------------------------------- |
| Organizations   | 1 ("Acme Corp")                                          |
| Teams           | 5                                                        |
| Users           | 30 (across 5 teams)                                      |
| Sessions        | ~15,000 (90 days)                                        |
| Non-agent PRs   | ~3,000 (baseline for cycle time + contribution %)        |
| Security events | ~500 (enough for meaningful severity/time distributions) |
| LLM providers   | 3 (Anthropic, OpenAI, Google)                            |
| Models          | 5                                                        |

## 6. Service Layer

`packages/shared/src/services/` provides query functions. Each accepts `Filters` and returns aggregated data. Services are synchronous (in-memory mock data) but the web dashboard wraps them in TanStack Query for loading states.

All services accept an optional `now` parameter (default: the mock generator's `now`, i.e., `2026-03-01T00:00:00Z`). This keeps the verification window and trend calculations consistent with the mock data timeline. In production with real data, `now` would default to `Date.now()`. Tests also freeze time to this value via `vi.useFakeTimers()` for determinism.

### Key service-level rules

- **Verification window**: PRs with `prMergedAt` within 48h of `now` are excluded from verified outcome counts
- **Cost per verified outcome**: fully-loaded — `totalSpendAllSessions / countVerifiedOutcomes`. Numerator includes spend on failed, abandoned, and in-progress sessions (the org pays for all of them)
- **Verified success rate**: `countVerifiedOutcomes / countCompletedSessions` where completed = status `completed` or `failed` (excludes `abandoned` and `active`). Sessions in the 48h verification window are excluded from both numerator and denominator
- **Previous period**: for trend `% change`, compare selected range against equal-length window immediately before. If previous period has no data, trend is `null`
- **Budget pro-rating**: `getSpendBreakdown` pro-rates `monthlyBudget` to the filter's date range length: `budget × (daysInRange / daysInMonth)`
- **Cycle time delta**: uses non-agent PRs as baseline — `(medianAgentTimeToMerge - medianBaselineTimeToMerge) / medianBaselineTimeToMerge`
- **Agent contribution %**: `agentLinesAdded / (agentLinesAdded + nonAgentLinesAdded) × 100`
- **Value-to-cost ratio**: `(estimatedHoursSaved × hourlyRate) / totalSpend`. Default `hourlyRate` = $75/hr (configurable). `estimatedHoursSaved` = sum of `estimatedTimeSavedMinutes / 60` for all sessions in period. Labeled as "estimated" in the UI

### Service inventory

| Service                | Input         | Output            | Key computations                                                                                              |
| ---------------------- | ------------- | ----------------- | ------------------------------------------------------------------------------------------------------------- |
| `getImpactSummary`     | Filters, now? | ImpactSummary     | FR-1: Cost per outcome, value-to-cost ratio, cycle time delta, agent contribution %, all 6 trends, sparklines |
| `getSpendBreakdown`    | Filters, now? | SpendBreakdown    | FR-2: Spend over time, by team (with pro-rated budget), by model, cost drivers, linear projection             |
| `getAdoptionMetrics`   | Filters, now? | AdoptionMetrics   | FR-3: Funnel counts, time-to-value, DAU/WAU series, capability breakdown, team success rates                  |
| `getQualityMetrics`    | Filters, now? | QualityMetrics    | FR-4: Verified success rate, autonomy distribution, intervention rate, revert rate, failure modes, p50/p95    |
| `getGovernanceMetrics` | Filters, now? | GovernanceMetrics | FR-5: Block/override rates, sensitive data stats, access scope, event log                                     |

### Linear projection

For month-end spend forecast (FR-2):

```typescript
function projectMonthEnd(dailySpend: number[], today: Date): number {
  const last7 = dailySpend.slice(-7);
  const avgDaily = last7.reduce((a, b) => a + b, 0) / last7.length;
  const daysRemaining = getDaysRemainingInMonth(today);
  const spentSoFar = dailySpend.reduce((a, b) => a + b, 0);
  return spentSoFar + avgDaily * daysRemaining;
}
```

## 7. Web Dashboard

### Routing (TanStack Router)

```
/                       → redirect to /dashboard
/dashboard              → Impact Summary (FR-1)
/dashboard/spend        → Spend & Forecasting (FR-2)
/dashboard/adoption     → Adoption & Enablement (FR-3) [stretch]
/dashboard/quality      → Quality & Autonomy (FR-4) [stretch]
/dashboard/governance   → Governance & Compliance (FR-5) [stretch]
```

### URL Search Params (type-safe filters)

All filters sync to URL via TanStack Router search params with Zod validation:

```typescript
const dashboardSearchSchema = z
  .object({
    from: z.string().optional(), // ISO date — required when range='custom'
    to: z.string().optional(), // ISO date — required when range='custom'
    teams: z.string().optional(), // comma-separated team IDs
    models: z.string().optional(), // comma-separated model names
    range: z.enum(['7d', '30d', '90d', 'custom']).optional().default('30d'),
  })
  .refine((d) => d.range !== 'custom' || (d.from && d.to), {
    message: 'from and to are required when range is custom',
  })
  .refine((d) => !d.from || !d.to || d.from <= d.to, {
    message: 'from must be before or equal to to',
  });
```

Example URL: `/dashboard/spend?range=90d&teams=platform,mobile&models=claude-sonnet-4-5`

### URL → Filter Mapping

The web dashboard converts URL search params to `FiltersSchema` before calling services:

```typescript
function urlParamsToFilters(params: DashboardSearch, now: Date): Filters {
  // Convert range preset to absolute dates
  const dateRange =
    params.range === 'custom'
      ? { from: params.from!, to: params.to! }
      : computeDateRange(params.range ?? '30d', now);

  return {
    dateRange,
    teamIds: params.teams?.split(',') ?? undefined,
    models: params.models?.split(',') ?? undefined,
    // providers is derived from selected models (not a separate URL param).
    // If a user filters by model, the provider is implicit.
  };
}
```

The `providers` field in `FiltersSchema` exists for MCP tools (where a caller might filter by provider without knowing model names) but is not exposed as a separate URL parameter in the web dashboard. The web UI has a single "Model" filter that groups models under their provider headers.

### Data Flow

```
URL search params (TanStack Router)
  → parsed into Filters (Zod validated)
    → passed to TanStack Query hook
      → calls shared service function
        → returns typed response
          → rendered by chart/metric components
```

Filter changes update the URL → TanStack Query refetches → charts re-render. No manual state management needed.

### Component Design Principles

- **Data via props** — components accept data, don't fetch. Keeps them testable.
- **Composition over configuration** — MetricCard takes children, not a config object.
- **Loading skeletons** — every data component has a skeleton state matching its layout.
- **Measurement badges** — MetricCard accepts `measurement: 'observed' | 'estimated'` and shows a subtle indicator.

## 8. MCP Server

### Transport Layer

The MCP server supports two transports, selected at startup:

```typescript
// main.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from './server.js';

const server = createServer();

if (process.argv.includes('--http')) {
  // Remote access: any MCP client can connect over HTTP
  const transport = new StreamableHTTPServerTransport({ port: 3001 });
  await server.connect(transport);
  console.log('MCP server listening on http://localhost:3001/mcp');
} else {
  // Local access: Claude Desktop, Claude Code, etc.
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
```

| Transport           | Use case                                               | How to connect                                    |
| ------------------- | ------------------------------------------------------ | ------------------------------------------------- |
| **stdio** (default) | Local — Claude Desktop, Claude Code                    | Add to `claude_desktop_config.json` as a command  |
| **HTTP** (`--http`) | Remote — team-wide deployment, CI agents, A2A (future) | Any MCP client connects to `http://host:3001/mcp` |

HTTP transport enables deploying the MCP server as a shared service — one instance serves the whole team. This is also the foundation for future [A2A protocol](https://a2a-protocol.org/) support, where autonomous agents query analytics over HTTP without human involvement.

### Tool Registration Pattern

Each tool follows the same pattern using `registerAppTool` and `registerAppResource` from `@modelcontextprotocol/ext-apps/server`.

```typescript
// tools/spend.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from '@modelcontextprotocol/ext-apps/server';
import { SpendBreakdownSchema, McpFiltersSchema, FiltersSchema } from '@agentview/shared';
import { getSpendBreakdown } from '@agentview/shared';
import { formatSpendSummary } from '../formatters/text.js';
import { applyDefaultFilters } from '../filters.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const DIST_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'ui');

export function registerSpendTools(server: McpServer) {
  const resourceUri = 'ui://agentview/spend';

  // Model-facing tool: LLM calls this, host renders the App UI
  registerAppTool(
    server,
    'get_spend_breakdown',
    {
      title: 'Get Spend Breakdown',
      description:
        'Returns AI agent spending breakdown by team, model, and time period with budget utilization and month-end forecast',
      inputSchema: {
        dateRange: McpFiltersSchema.shape.dateRange,
        teamIds: McpFiltersSchema.shape.teamIds,
        models: McpFiltersSchema.shape.models,
        providers: McpFiltersSchema.shape.providers,
      },
      outputSchema: SpendBreakdownSchema,
      _meta: { ui: { resourceUri } },
    },
    (params) => {
      const mcpFilters = McpFiltersSchema.parse(params);
      const filters = applyDefaultFilters(mcpFilters); // fills in dateRange if missing
      const data = getSpendBreakdown(filters);
      return {
        content: [{ type: 'text', text: formatSpendSummary(data) }],
        structuredContent: data, // validated against outputSchema by the SDK
      };
    },
  );

  // App-only tool: UI calls this directly to refresh with changed filters.
  // visibility: ['app'] hides this from the model — only the App UI can invoke it.
  registerAppTool(
    server,
    'poll_spend_data',
    {
      title: 'Poll Spend Data',
      description: 'Returns spend data for UI polling with updated filters',
      inputSchema: {
        dateRange: FiltersSchema.shape.dateRange,
        teamIds: FiltersSchema.shape.teamIds,
        models: FiltersSchema.shape.models,
        providers: FiltersSchema.shape.providers,
      },
      outputSchema: SpendBreakdownSchema,
      _meta: { ui: { visibility: ['app'] } },
    },
    (params) => {
      const filters = FiltersSchema.parse(params);
      const data = getSpendBreakdown(filters);
      return {
        content: [{ type: 'text', text: JSON.stringify(data) }],
        structuredContent: data,
      };
    },
  );

  // Register the App UI HTML resource
  registerAppResource(
    server,
    'Spend Analytics',
    resourceUri,
    { description: 'Interactive Spend Analytics Dashboard' },
    () => {
      const html = readFileSync(join(DIST_DIR, 'spend/mcp-app.html'), 'utf-8');
      return {
        contents: [
          {
            uri: resourceUri,
            mimeType: RESOURCE_MIME_TYPE,
            text: html,
          },
        ],
      };
    },
  );
}
```

### Tool Inventory

| Tool                     | Type         | Description                                               |
| ------------------------ | ------------ | --------------------------------------------------------- |
| `get_impact_summary`     | model-facing | FR-1: Impact Summary KPIs                                 |
| `poll_impact_data`       | app-only     | FR-1: UI refresh for Impact                               |
| `get_spend_breakdown`    | model-facing | FR-2: Spend by team/model/time                            |
| `poll_spend_data`        | app-only     | FR-2: UI refresh for Spend                                |
| `get_adoption_metrics`   | model-facing | FR-3: Funnel, DAU, capabilities                           |
| `poll_adoption_data`     | app-only     | FR-3: UI refresh for Adoption                             |
| `get_quality_metrics`    | model-facing | FR-4: Success rate, autonomy, failures                    |
| `poll_quality_data`      | app-only     | FR-4: UI refresh for Quality                              |
| `get_governance_summary` | model-facing | FR-5: Policy effectiveness, events                        |
| `poll_governance_data`   | app-only     | FR-5: UI refresh for Governance                           |
| `get_metadata`           | model-facing | Discovery: teams, models, providers, task types, org info |

### Text Formatting

For non-App clients (e.g., Claude Code CLI), each tool returns a readable text summary:

```
📊 Spend Breakdown (Feb 1 – Feb 28, 2026)

Total spend: $42,350 (↑12% vs previous period)
Projected month-end: $46,100 (based on trailing 7-day average)
Cost per verified outcome: $1.08

By Team:                          Budget
  Platform    $15,200 / $18,000   84% ██████████░░
  Mobile      $11,800 / $12,000   98% ████████████ ⚠️
  Backend      $8,900 / $15,000   59% ███████░░░░░
  Frontend     $4,250 /  $8,000   53% ██████░░░░░░
  Data         $2,200 /  $5,000   44% █████░░░░░░░

By Model:                                  Success
  Claude Sonnet 4.5    $26,200  (62%)      88%
  GPT-4o               $11,900  (28%)      82%
  Gemini 2.0 Flash      $4,250  (10%)      71%
```

### MCP App UI Flow

1. User asks Claude: "Show me spending by team for the last 30 days"
2. LLM calls `get_spend_breakdown({ dateRange: { from: "2026-02-01", to: "2026-02-28" } })`
3. Tool returns text summary (LLM sees this) + structuredContent
4. MCP App-capable host renders the Spend App UI in an iframe
5. App receives structuredContent via `app.ontoolresult`
6. App renders Recharts charts with date range pre-set to Feb 2026
7. User changes date range to 90 days in the App UI dropdown
8. App calls `poll_spend_data` (app-only) with new filters
9. Server returns updated data → charts re-render
10. No LLM involved in steps 7-9

### MCP App UI Architecture

Each App UI follows the same pattern (React + Recharts + `@modelcontextprotocol/ext-apps`). The ext-apps package provides both a vanilla JS `App` class and React hooks (`useApp`, `useHostStyles`).

```typescript
// apps/spend/src/mcp-app.tsx
import { useApp, useHostStyles } from '@modelcontextprotocol/ext-apps/react';
import { useState, useEffect } from 'react';
import { AreaChart, BarChart, PieChart } from 'recharts';
import type { SpendBreakdown, Filters } from '@agentview/shared';

function SpendApp() {
  const { app } = useApp({ name: 'Spend Analytics', version: '1.0.0' });
  useHostStyles();  // syncs host theme (dark/light) into the iframe
  const [data, setData] = useState<SpendBreakdown | null>(null);
  const [filters, setFilters] = useState<Filters | null>(null);

  useEffect(() => {
    if (!app) return;

    // Receive initial data from LLM tool call
    app.ontoolresult = (result) => {
      if (result.structuredContent) {
        setData(result.structuredContent as SpendBreakdown);
      }
    };
  }, [app]);

  // When user changes filters in the App UI
  const handleFilterChange = async (newFilters: Filters) => {
    if (!app) return;
    setFilters(newFilters);
    const result = await app.callServerTool({
      name: 'poll_spend_data',
      arguments: newFilters,
    });
    if (result.structuredContent) {
      setData(result.structuredContent as SpendBreakdown);
    }
  };

  if (!data) return <p>Waiting for results...</p>;

  return (
    <main>
      <FilterBar filters={filters} onChange={handleFilterChange} />
      <SpendOverTimeChart data={data.spendByDay} />
      <BudgetUtilizationChart data={data.spendByTeam} />
      <ModelComparisonChart data={data.spendByModel} />
    </main>
  );
}
```

## 9. Build & Development

### Monorepo Setup

npm workspaces with three packages:

```json
// root package.json
{
  "workspaces": ["packages/shared", "packages/web", "packages/mcp-server"]
}
```

Build order: shared → web + mcp-server (parallel).

### Development Scripts

```
npm run dev:web         → Vite dev server (web dashboard)
npm run dev:mcp         → MCP server in HTTP dev mode with watch
npm run build           → Build all packages (shared → web + mcp-server)
npm run build:shared    → Build shared package only
npm run build:web       → Build web dashboard
npm run build:mcp       → Build MCP server + App UIs
npm run test            → Vitest (unit + integration)
npm run test:e2e        → Playwright (stretch)
npm run lint            → ESLint across all packages
npm run typecheck       → tsc --noEmit across all packages
```

### MCP App UI Build

Each App UI is built separately into a single HTML file:

```typescript
// packages/mcp-server/vite.config.ts
import { resolve } from 'path';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Build a single App UI at a time. The build:ui script iterates over entries.
// Entry name is passed via VITE_UI_ENTRY env var.
const entry = process.env.VITE_UI_ENTRY || 'impact';

export default defineConfig({
  root: resolve(__dirname, `apps/${entry}`),
  plugins: [viteSingleFile()],
  build: {
    rollupOptions: {
      input: resolve(__dirname, `apps/${entry}/mcp-app.html`),
    },
    outDir: resolve(__dirname, `dist/ui/${entry}`),
    emptyOutDir: true,
  },
});
```

Build script (`packages/mcp-server/build-apps.ts`) iterates over apps programmatically:

```typescript
// build-apps.ts — Node script for reliable cross-platform builds
import { execSync } from 'child_process';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appsDir = join(__dirname, 'apps');
const apps = readdirSync(appsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

for (const app of apps) {
  console.log(`Building MCP App: ${app}`);
  execSync(`vite build`, {
    env: { ...process.env, VITE_UI_ENTRY: app },
    stdio: 'inherit',
    cwd: __dirname,
  });
}
```

### CI Pipeline (GitHub Actions)

```yaml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test -- --reporter=verbose
      - run: npm run build
```

## 10. Error Handling Strategy

All error handling follows one principle: **fail gracefully, show context, offer recovery.**

### Service Layer (shared)

Services are synchronous and operate on in-memory mock data, so runtime errors are limited to bad filter inputs:

| Scenario                             | Behavior                                                                             |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| Invalid date range (`from > to`)     | Throw `InvalidFilterError` with message. Caller decides how to surface it.           |
| Non-existent team/model ID in filter | Return empty result with correct schema shape (zero totals, empty arrays). No error. |
| Empty date range (no sessions match) | Return zero totals and empty arrays. Valid response, not an error.                   |

Services never return `undefined` or `null` at the top level — always a fully-shaped response object.

### Web Dashboard

| Layer             | Mechanism                                                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| React tree        | Top-level `ErrorBoundary` at the dashboard layout catches unexpected render errors. Shows "Something went wrong" with a reload button. |
| Data fetching     | TanStack Query's `error` state per query. Each page/section shows an inline error callout with retry button — not a full-page error.   |
| Loading           | TanStack Query's `isPending` state. Components render skeleton placeholders matching their layout.                                     |
| Empty results     | Components check for empty data and show "No data for this period" message with suggestion to adjust filters.                          |
| Filter validation | TanStack Router's Zod search param validation. Invalid URL params fall back to defaults silently (no crash on malformed URLs).         |

Components receive data via props and handle three states: **loading** (skeleton), **error** (callout + retry), **empty** (message). No component renders `undefined` data.

### MCP Server

| Scenario                    | Behavior                                                                                           |
| --------------------------- | -------------------------------------------------------------------------------------------------- |
| Invalid tool parameters     | Zod validation error → return structured error response with field-level messages. No stack trace. |
| Missing optional parameters | Default to full date range, all teams, all models.                                                 |
| Service-layer error         | Catch and return `{ content: [{ type: 'text', text: 'Error: <message>' }], isError: true }`.       |
| App UI resource not found   | Return 404-style error in resource response.                                                       |

MCP tools never throw unhandled exceptions — all errors are caught and returned as structured responses that LLMs can interpret.

## 11. Authentication (Minimal)

No login flow. Multi-tenancy awareness only:

- Web dashboard reads `?org=acme-corp` query param (defaults to `acme-corp`)
- MCP tools accept optional `orgId` parameter (defaults to `acme-corp`)
- Mock data generator produces data for one org only
- README note: "In production, integrates with SSO/SAML, maps authenticated user to org, enforces RBAC per section"

## 12. Key Design Decisions

### Why Vite + React instead of Next.js

- No SSR needed — client-side dashboard with in-memory mock data
- Simpler build, especially in monorepo with MCP server
- MCP App UIs also use Vite 7 — consistent tooling across the project
- TanStack Router + Query gives us everything Next.js would (routing, data fetching, caching) without the framework overhead

### Why monorepo with shared package

- Same Zod schemas, mock generator, and service functions serve both web and MCP
- Changes to data model propagate to both interfaces automatically
- Tests on the shared layer cover both consumers
- No API serialization boundary — services return typed objects directly

### Why Recharts for both web and MCP App UIs

- Consistent charting API — shared component patterns, shared theming
- MCP App UIs already use React — Recharts is a natural fit
- Bundle size (~200KB gzipped) is acceptable for iframe-based App UIs
- Avoids maintaining two charting codebases with different APIs

### Why TanStack Router over React Router

- Type-safe search params with Zod validation — perfect for dashboard filters
- Built-in search param serialization — filters persist in URL automatically
- Same ecosystem as TanStack Query — consistent patterns
- React Router v7's advanced features require framework mode (not SPA)

### Why seeded mock data

- Deterministic: tests don't flake, screenshots match
- Realistic: patterns model actual usage, not random noise
- Configurable: change seed for different scenarios
