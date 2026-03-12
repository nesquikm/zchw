# Requirements Spec: AgentView — Organizational Analytics Dashboard

## 1. Product Vision

**AgentView** is an analytics dashboard for organizations whose engineering teams use cloud-based AI coding agents (like Claude Code on the web, Zencoder Zenflow, or similar).

It answers two executive questions:

1. _"Is our AI investment paying off?"_
2. _"Where should we invest more — and where is AI failing?"_

AgentView is delivered through **two interfaces** to the same data:

1. **Web Dashboard** — a full-featured browser app for deep exploration
2. **MCP Server** — AI-native analytics via tools + rich interactive MCP Apps

The MCP interface lets engineers ask questions conversationally ("how much did my team spend this month?") and get both a text answer (for any MCP client) and a rich interactive UI (for MCP App-capable clients like Claude Desktop). The interactive UI comes pre-filled with what the LLM queried but lets users freely change parameters — bridging "AI answers your question" with "keep exploring on your own."

### Dashboard Narrative: The Path to Autonomy

The dashboard tells a progression story:

1. **Adoption** — are people using it? _(metrics: active users/seats, activation funnel, time-to-value, capability adoption)_
2. **Trust** — is the output good enough to merge? _(metrics: verified success rate, revert rate, autonomy distribution, intervention rate)_
3. **Efficiency** — is it cheaper/faster than doing it manually? _(metrics: cost per verified outcome, cycle time delta, agent contribution %, value-to-cost ratio)_
4. **Scale** — where are the bottlenecks preventing more value? _(metrics: failure mode breakdown, "where AI is failing" view, policy effectiveness, cost drivers)_

Every metric maps to one of these stages. The executive summary shows where the organization sits on this journey.

## 2. Target Personas (informs metric selection)

The dashboard provides a single unified view — no per-role UI or auth-based customization. These personas explain **who we designed the metrics for and why**, not separate user experiences.

- **VP of Engineering / Engineering Director** — needs to justify AI tooling spend to C-suite (CEO, CTO, CFO — senior leadership). Drives our choice of cost-per-outcome, cycle time impact, and adoption trends as top-level metrics. Wants to see where AI is failing, not just where it's succeeding.
- **Team Lead / Engineering Manager** — compares teams, monitors code quality, identifies onboarding gaps. Drives team-level breakdowns, verified success rate, autonomy distribution, and the adoption funnel.
- **Finance / Procurement** — tracks spend against budgets. Drives cost-per-outcome views, budget utilization with alerts, and spend forecasting.

### Out of Scope (this version)

- [A2A (Agent-to-Agent) protocol](https://a2a-protocol.org/) interoperability (see Future scope in §8)
- Per-role dashboards or role-based access control
- Individual developer self-service analytics
- Admin settings (user management, billing configuration)
- Real-time WebSocket-based monitoring
- Slack/email alerting

### DO NOT (Explicit Exclusions)

These are hard constraints — the system SHALL NOT:

- **DO NOT** implement a login flow, user management, or session-based auth. Multi-tenancy is query-param only.
- **DO NOT** connect to real external services (GitHub, GitLab, CI providers, LLM APIs). All data is mocked.
- **DO NOT** store user data, cookies, or PII beyond localStorage for UI preferences (e.g., dismissed banner).
- **DO NOT** implement real-time updates (WebSocket, SSE, polling). Data refreshes on filter change only.
- **DO NOT** build an admin panel, settings page, or billing configuration UI.
- **DO NOT** add a multi-org switcher or org management features. Single org, hardcoded.
- **DO NOT** implement CSV/PDF export, email reports, or Slack notifications.
- **DO NOT** build individual developer analytics or per-user drill-down views.
- **DO NOT** make architectural decisions that require a backend server for the web dashboard. It's a client-side SPA with in-memory data.
- **DO NOT** add AI chat or natural language query features to the web dashboard (future scope — the MCP server is the AI interface).

## 3. Key Definitions

- **Session** — a single agent run: a user (or automation) gives the agent a task, the agent works on it, and eventually completes, fails, or is abandoned. One session may produce zero or more patches/PRs. A session starts when the agent is invoked and ends when it finishes or the user stops it.
- **Verified outcome** — an agent-assisted PR that was merged, passed CI, and was not reverted within 48 hours. This is the atomic unit of value. Attribution: if an agent session contributed code to a PR (by authorship or co-authorship), that PR counts as agent-assisted.
- **Intervention** — a human correction during a session: editing generated code, re-prompting after a bad result, or rejecting a suggestion and providing new direction. Automated retries (e.g., agent self-correcting after a test failure) do not count.
- **Autonomy levels**:
  - **Level 1 (Guided)** — human prompts each step, reviews each output before proceeding
  - **Level 2 (Supervised)** — agent proposes a complete solution, human reviews and approves before merge
  - **Level 3 (Autonomous)** — agent completes the task end-to-end (writes code, runs tests, opens PR) with no human intervention during the session
- **Revert** — a verified outcome is considered reverted if the PR's changes are substantially undone (>50% of lines removed or replaced) within 48 hours of merge, by any author.
- **Verification window** — a merged PR enters a 48-hour verification window. During this window, its status is **pending** (not yet verified, not yet failed). Only after 48 hours without revert does it become a verified outcome. Dashboard metrics that depend on verified outcomes exclude PRs still in their verification window to avoid premature counting.
- **Baseline** — for comparative metrics (cycle time delta), baseline is the rolling 90-day **median** for non-agent-assisted work in the same team/repo. Median is used instead of mean because merge times have long tails (a few multi-day PRs would skew the average). Mock data generates both agent-assisted and non-agent PRs to enable this comparison.
- **Previous period** — for trend calculations (e.g., "% change vs previous period"), the previous period is a window of equal length immediately preceding the selected range. Example: if the selected range is Feb 1–28 (28 days), the previous period is Jan 4–31 (28 days). If the previous period has no data (e.g., selected range starts at the beginning of mock data), the trend is omitted or shown as "N/A."
- **Budget pro-rating** — team `monthlyBudget` applies to a calendar month. For non-30-day date ranges, budget utilization is pro-rated: `(team spend in range) / (monthlyBudget × daysInRange / daysInMonth)`. `daysInMonth` = calendar days in the month containing the range's end date (e.g., February = 28, March = 31). For ranges spanning multiple months, use the end date's month — this is an approximation that's good enough for dashboard display. Example: 7-day range ending in February → budget target ≈ `monthlyBudget × 7/28` ≈ 25% of monthly budget.

## 4. Functional Requirements

### FR-1: Impact Summary (top-level page — key numbers at a glance)

The hero page answers "is this worth it?" in under 30 seconds.

The system SHALL display:

- **Cost per verified outcome** — total AI spend across ALL sessions in the period / count of verified outcomes in that period. This is a fully-loaded cost: it includes spend on failed, abandoned, and in-progress sessions because the organization pays for all of them. The North Star metric
- **Value-to-cost ratio** — (estimated value of engineering time saved) / (AI spend), with visible assumptions and inputs. Explicitly labeled as model-derived estimate
- **Cycle time delta** — change in median time-to-merge for agent-assisted work vs. baseline
- **Agent contribution %** — what percentage of committed code (lines added) came from AI agent sessions vs. total code committed (agent + non-agent). Requires both agent session data and non-agent PR data in the mock dataset
- **Active users / total seats** — adoption percentage with trend
- **Verified outcomes this period** — count of verified outcomes (see definitions) in the selected date range
- **Trend sparklines** for each KPI showing direction over the selected date range. Sparklines always contain up to 30 data points — for ranges shorter than 30 days, one point per day; for longer ranges, points are bucketed (e.g., 90d → 3-day buckets). For ratio metrics (cost per outcome), days/buckets with zero denominators are interpolated from neighbors or shown as gaps.

**Acceptance criteria:**

- **AC-1.1:** Given default filters (30 days), when the Impact Summary page loads, then 6 metric cards are visible, each with a value, trend indicator, and sparkline.
- **AC-1.2:** Given the dashboard is loaded, when I inspect the "Cost per verified outcome" card, then it shows an "Observed" measurement badge.
- **AC-1.3:** Given the dashboard is loaded, when I inspect the "Value-to-cost ratio" card, then it shows an "Estimated" badge and the assumptions (hourly rate, hours saved, total spend) are visible on hover or drill-down.
- **AC-1.4:** Given I change the date range filter from 30d to 7d, then all 6 metric values update to reflect only the last 7 days.
- **AC-1.5:** Given mock data with seed 42, when Impact Summary loads, then verified outcomes ≤ total completed sessions, and active users ≤ total seats.

### FR-2: Spend & Forecasting

The system SHALL provide cost analytics:

- Spend over time (daily/weekly granularity) with burn rate and month-end linear projection (based on trailing 7-day trend)
- Budget utilization per team with visual threshold alerts (approaching/exceeding budget)
- **Cost drivers** — top teams, models, and task types causing spend (replaces raw token trends)
- **Cost per outcome by team** — which teams get the most value per dollar
- Cost per outcome by model — cost-quality tradeoff view (e.g., "Claude Sonnet: $1.20/PR at 88% success vs. GPT-4o mini: $0.40/PR at 71% success")
- Spend by LLM provider and model (donut chart)
- Token consumption available as drill-down (not top-level)

**Acceptance criteria:**

- **AC-2.1:** Given default filters, when the Spend page loads, then a spend-over-time area chart, budget utilization bars, cost drivers chart, model comparison, and spend-by-model donut are all visible.
- **AC-2.2:** Given mock data, when I view budget utilization, then budgets are pro-rated to the selected date range (see §3 "Budget pro-rating"), and at least one team shows an "approaching" or "exceeding" budget alert (visual threshold indicator).
- **AC-2.3:** Given a 30-day view, when I check the month-end projection, then the projected value ≥ the total spent so far.
- **AC-2.4:** Given mock data, when I view spend by team, then the individual team amounts sum to the total spend (within $1 rounding tolerance).
- **AC-2.5:** Given mock data, when I view cost per outcome by model, then at least two models are shown with their cost, success rate, and a visible tradeoff (cheaper model = lower success rate).

### FR-3: Adoption & Enablement

The system SHALL track adoption and onboarding:

- **Activation funnel**: invited → first session → first verified outcome → regular user (≥3 sessions/week)
- **Time-to-value**: median time from invite → first merged PR
- Daily and weekly active users over time
- **Capability adoption**: which features teams actually use (code generation, code review, test writing, debugging, documentation, refactoring) — surfaces under-discovered capabilities
- Usage distribution by team with **"where AI is failing" highlight** — teams with low success rates are surfaced prominently so leadership can investigate (context issues? legacy codebase? training gap?)
- Sessions per user per week (engagement depth)

**Acceptance criteria:**

- **AC-3.1:** Given default filters, when the Adoption page loads, then the activation funnel shows 4 stages with monotonically decreasing counts (invited ≥ activated ≥ first outcome ≥ regular).
- **AC-3.2:** Given mock data, when I view time-to-value, then the median is > 0 days and displayed in human-readable format.
- **AC-3.3:** Given mock data, when I view team usage distribution, then teams with below-average success rate are visually highlighted as "where AI is failing."
- **AC-3.4:** Given mock data, when I view capability adoption, then at least 4 of 6 task types are represented.

### FR-4: Quality & Autonomy

The system SHALL display quality and autonomy indicators:

- **Verified success rate** — percentage of **completed sessions** (status = `completed` or `failed`, excluding `abandoned` and `active`) that produced a verified outcome (merged + CI pass + no revert within 48h). Sessions still in the 48h verification window are excluded from both numerator and denominator. Explicitly distinguishes between observed (git/CI events) and estimated metrics
- **Autonomy distribution** — sessions categorized by autonomy level:
  - Level 1: Human guided every step
  - Level 2: Agent proposed, human approved
  - Level 3: Fully autonomous (agent completed task, opened PR with no human intervention)
- **Intervention rate** — average human corrections/re-prompts per session
- **Revert rate** — percentage of outcomes that were reverted: `reverted / (verified + reverted)`. Denominator is all PRs that exited the 48h verification window (see definitions in §3)
- **Failure mode breakdown** — why sessions fail: agent error, infra/environment issue, policy block, test failure, human abandoned. Shows where to invest to improve success rate
- Completion time trends (p50/p95 latency)

**Acceptance criteria:**

- **AC-4.1:** Given default filters, when the Quality page loads, then verified success rate, autonomy distribution, intervention rate, revert rate, failure mode breakdown, and p50/p95 latency are all visible.
- **AC-4.2:** Given mock data, when I view autonomy distribution, then the three levels (guided/supervised/autonomous) sum to 100%.
- **AC-4.3:** Given mock data, when I view failure mode breakdown, then percentages sum to 100% of failed sessions, and at least 3 failure modes are present.
- **AC-4.4:** Given mock data, when I view completion time, then p95 ≥ p50.
- **AC-4.5:** Given mock data, when I compare autonomy distribution for the first 30 days vs. the last 30 days using the date range filter, then Level 3 (autonomous) percentage is higher in the later period. (Note: this AC validates the mock data's autonomy progression pattern and the service's correct filtering by date range — tested in `generator.test.ts` for the pattern and `quality.test.ts` for the filter behavior.)

### FR-5: Governance & Compliance

The system SHALL provide governance analytics:

- **Policy effectiveness**: block rate (how often policies stop an action), override rate, top violated policies with trend
- **Sensitive data exposure**: attempts blocked vs. allowed
- Access scope audit: repositories and services agents interacted with, least-privilege compliance
- Event log of consequential agent actions (file modifications, API calls, shell commands)
- Severity distribution of security events over time

**Acceptance criteria:**

- **AC-5.1:** Given default filters, when the Governance page loads, then policy block rate, override rate, sensitive data stats, and event log are visible.
- **AC-5.2:** Given mock data, when I view the event log, then entries are sorted by timestamp descending.
- **AC-5.3:** Given mock data, when I view sensitive data exposure, then blocked + allowed = total sensitive data events.

### FR-6: AI Integration Callout

The web dashboard SHALL include a persistent banner/callout:

- Promotes the MCP integration: "Explore this data conversationally — connect AgentView to Claude Desktop or any MCP-compatible AI assistant"
- Teases upcoming feature: "AI chat with dynamic dashboard views — coming soon"
- Dismissible, non-intrusive

**Acceptance criteria:**

- **AC-6.1:** Given the dashboard is loaded, when I view any page, then the MCP callout banner is visible.
- **AC-6.2:** Given the banner is visible, when I click dismiss, then the banner disappears.
- **AC-6.3:** Given I dismissed the banner and reload the page, then the banner remains hidden (localStorage persistence).

### FR-7: Filtering & Navigation

The system SHALL support:

- Global date range picker (7d, 30d, 90d, custom)
- Team/department filter (multi-select)
- LLM provider/model filter
- Filters persist in URL (bookmarkable, shareable)
- Sidebar navigation between dashboard sections

**Acceptance criteria:**

- **AC-7.1:** Given the dashboard is loaded, when I select "7d" in the date range picker, then the URL updates to include `range=7d` and all charts re-render with 7-day data.
- **AC-7.2:** Given the URL `/dashboard/spend?range=90d&teams=platform`, when the page loads, then the date picker shows 90d selected and team filter shows "Platform" selected.
- **AC-7.3:** Given I select multiple teams in the filter, when I copy the URL and open it in a new tab, then the same filters are applied.
- **AC-7.4:** Given the sidebar is visible, when I click "Spend", then I navigate to `/dashboard/spend` without a full page reload.

### FR-8: MCP Server Interface

The system SHALL expose analytics via MCP tools, accessible both locally (stdio) and remotely (HTTP):

- **Dual transport**: stdio for local clients (Claude Desktop, Claude Code) and HTTP (`StreamableHTTPServerTransport`) for remote/shared deployment. HTTP enables team-wide access from a single server instance and lays the groundwork for future A2A integration
- Each dashboard section has a corresponding tool:
  - `get_impact_summary` — Impact Summary metrics
  - `get_spend_breakdown` — Spend & Forecasting data
  - `get_adoption_metrics` — Adoption & Enablement data
  - `get_quality_metrics` — Quality & Autonomy data
  - `get_governance_summary` — Governance & Compliance data
- Tools accept filter parameters (date range, team, model)
- Tools return **both**:
  - Formatted text summary (works in any MCP client, including CLI-only tools like Claude Code)
  - Structured data (`structuredContent`) for MCP App rendering
- **MCP App UIs** pre-fill with the LLM-requested parameters but allow user interaction:
  - Change date range, team filter, model filter on the fly
  - Switch between chart views (e.g., "by team" → "by model")
  - All without LLM round-trips — the UI calls app-only tools directly
- **App-only tools** for UI-driven data fetching (e.g., `poll_spend_data` with `visibility: ["app"]`)

**Acceptance criteria:**

- **AC-8.1:** Given a running MCP server, when an LLM calls `get_spend_breakdown` with a 30-day date range, then the tool returns both a non-empty text summary and structuredContent that validates against SpendBreakdownSchema.
- **AC-8.2:** Given a running MCP server, when I list available tools, then all 6 model-facing tools and 5 app-only tools are registered.
- **AC-8.3:** Given an MCP App UI for Spend, when the user changes the date range in the App UI, then the App calls `poll_spend_data` (not the model-facing tool) and charts update without LLM involvement.
- **AC-8.4:** Given a CLI-only MCP client (e.g., Claude Code), when an LLM calls `get_impact_summary`, then the text response contains formatted KPI values (dollar amounts, percentages) that are human-readable.
- **AC-8.5:** Given invalid filter parameters (e.g., malformed date), when a tool is called, then it returns a structured Zod validation error, not a stack trace.

### FR-9: Data Freshness & Measurement Integrity

- All charts show the data's time range and selected filter context
- Loading and error states for every data-fetching component
- **Measurement integrity**: every metric is labeled as one of:
  - **Observed** — derived from git/CI/platform events (e.g., PRs merged, CI results)
  - **Estimated** — model-derived with stated assumptions (e.g., time saved, dollar value)
  - This distinction is visible in the UI (e.g., subtle indicator or tooltip)

**Acceptance criteria:**

- **AC-9.1:** Given any chart or metric card, when I inspect it, then a data range label is visible showing the active filter period.
- **AC-9.2:** Given a data-fetching component, when data is loading, then a skeleton/loading state is shown (no layout shift).
- **AC-9.3:** Given a metric derived from estimates (e.g., value-to-cost ratio), when I view it, then it has an "Estimated" badge. Given an observed metric (e.g., verified success rate), then it has an "Observed" badge.

## 5. Wireframes

### Impact Summary Page (FR-1)

```
┌──────────────────────────────────────────────────────────────────────┐
│ ┌─────────┐  AgentView — Acme Corp          [7d] [30d] [90d] [Custom]│
│ │ Impact  │                                  Teams: [All ▾] Models: [All ▾]│
│ │ Spend   │─────────────────────────────────────────────────────────│
│ │ Adopt°  │                                                         │
│ │ Quality │  ┌─MCP Banner──────────────────────────────────────[✕]─┐│
│ │ Gov°    │  │ Explore this data conversationally — connect to AI  ││
│ │         │  └─────────────────────────────────────────────────────┘│
│ │         │                                                         │
│ │         │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐│
│ │         │  │ Cost/Outcome │ │ Value:Cost   │ │ Cycle Time Δ    ││
│ │         │  │ $1.08  ↓12% │ │ 4.2x  ↑8%   │ │ -23%   ↓3%      ││
│ │         │  │ ▁▂▃▅▆▇ [Obs]│ │ ▂▃▅▆▇█ [Est]│ │ ▇▆▅▃▂▁ [Obs]    ││
│ │         │  └──────────────┘ └──────────────┘ └──────────────────┘│
│ │         │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐│
│ │         │  │ Agent Contrib│ │ Adoption     │ │ Verified Outcomes││
│ │         │  │ 34.5%  ↑5%  │ │ 24/50  ↑2    │ │ 847    ↑11%     ││
│ │         │  │ ▂▃▃▅▆▇ [Obs]│ │ ▁▂▃▅▆▇ [Obs]│ │ ▂▃▅▅▆▇ [Obs]    ││
│ │         │  └──────────────┘ └──────────────┘ └──────────────────┘│
│ └─────────┘                                                         │
│                              Data: Dec 1, 2025 – Feb 28, 2026      │
└──────────────────────────────────────────────────────────────────────┘

[Obs] = Observed badge    [Est] = Estimated badge    ▁▂▃ = sparkline
```

### Spend & Forecasting Page (FR-2)

```
┌──────────────────────────────────────────────────────────────────────┐
│ [Sidebar]  Spend & Forecasting              [Filters]               │
│            ─────────────────────────────────────────────────────────│
│                                                                      │
│  ┌─ Spend Over Time (Area Chart) ──────────────────────────────────┐│
│  │  $$$                                                    ╱ proj  ││
│  │    ╱╲   ╱╲╱╲  ╱╲   ╱╲╱╲  ╱╲╱╲╱╲                  ╱╱╱        ││
│  │  ╱╱  ╲╱╱    ╲╱  ╲╱╱    ╲╱       ╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱            ││
│  │  ──────────────────────────────────────────────── → days        ││
│  │  Total: $42,350 | Projected month-end: $46,100                  ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ┌─ Budget Utilization ──────────┐  ┌─ Spend by Model (Donut) ────┐│
│  │ Platform  ████████░░ 84%      │  │     ╭───╮                    ││
│  │ Mobile    ██████████ 98% ⚠️   │  │   ╭─┤Son├─╮  Sonnet: 62%   ││
│  │ Backend   ██████░░░░ 59%      │  │   │ ╰───╯ │  GPT-4o: 28%   ││
│  │ Frontend  █████░░░░░ 53%      │  │   ╰─┬───┬─╯  Gemini: 10%   ││
│  │ Data      ████░░░░░░ 44%      │  │     ╰───╯                    ││
│  └───────────────────────────────┘  └──────────────────────────────┘│
│                                                                      │
│  ┌─ Cost per Outcome by Model ─────────────────────────────────────┐│
│  │ Model             Cost/PR    Success    Verdict                  ││
│  │ Claude Sonnet 4.5 $1.20      88%        Best value              ││
│  │ GPT-4o            $0.95      82%        Good balance             ││
│  │ Gemini 2.0 Flash  $0.40      71%        Cheap but risky          ││
│  └─────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────┘
```

## 6. Non-Functional Requirements

### NFR-1: Performance

- Initial page load (LCP) under 2 seconds
- Chart renders complete within 500ms of data arrival
- No layout shift after initial render (CLS ≈ 0)

### NFR-2: Responsiveness

- Fully usable on desktop (1280px+)
- Functional on tablet (768px+)
- Mobile: read-only (charts viewable, no complex interactions required)

### NFR-3: Accessibility

- Keyboard navigable (tab order, focus indicators)
- Color-blind safe chart palettes
- ARIA labels on interactive elements

### NFR-4: Browser Support

- Chrome, Firefox, Safari, Edge (latest 2 versions)

### NFR-5: Authentication (minimal)

- API key header or query param for multi-tenancy awareness
- No login flow — out of scope for this version
- Spec note: in production, this would integrate with SSO/SAML and map to organization-level RBAC

## 7. Metrics Rationale — Why These Matter

### Cost per verified outcome as the North Star

Not "cost per session" or "cost per token" — cost per _actually useful_ output. A merged PR that passes CI is the atomic unit of value. This is what survives CFO scrutiny.

### Verified success rate over task completion

An agent can "complete" garbage. Verified success (merged + CI pass + no revert) measures real quality. We explicitly label this as observed (from git/CI events), not estimated.

### Autonomy distribution — the unique differentiator

Neither Copilot nor Cursor tracks this. Cloud agents can operate at different autonomy levels, and organizations want to see the progression from "human does everything" to "agent handles it end-to-end." This directly maps to the "Path to Autonomy" narrative.

### Intervention rate and revert rate

These measure the _hidden cost_ of AI assistance. A session that "succeeds" but requires 8 human corrections isn't saving time. A PR that merges but gets reverted the next day isn't a real outcome. These metrics expose both.

### "Where AI is failing" view

The CEO doesn't want an all-green dashboard. They want to see exactly where to invest: which teams struggle, which task types fail, which models underperform. This is the actionable insight that drives budget decisions.

### Adoption funnel with time-to-value

Raw DAU hides the real story. The funnel (invited → activated → first verified outcome → regular) reveals where adoption stalls. Adding time-to-value shows whether onboarding is fast or broken.

### Policy effectiveness over violation counts

"47 policy violations" is meaningless without context. Block rate (policies are working), override rate (policies are too strict or people are circumventing), and top violated policies (where to focus) — this is what security teams actually need.

### MCP as a delivery channel

Engineering leaders already live in AI tools. Letting them query analytics conversationally — and get interactive, explorable charts inline — removes the friction of switching to a separate dashboard. The pre-filled + interactive pattern (LLM sets initial params, user explores freely) is a genuinely novel UX.

### Measurement integrity

Every metric labeled as observed or estimated. Executives distrust dashboards full of made-up numbers. By being transparent about what's measured vs. modeled, we build trust. The Impact Summary page is dominated by observed metrics.

## 8. MVP Scope

### Must Have (MVP)

- **Impact Summary page** (FR-1) — all metrics with sparklines. The hero page
- **Spend & Forecasting page** (FR-2) — all cost analytics
- **AI Integration Callout** (FR-6) — MCP banner + "AI chat coming soon"
- **Filtering** (FR-7) — date range, team, model filters across all pages
- **MCP Server** — all 5 tools with text summaries + structured data
- **MCP App UIs** — interactive Apps for Impact Summary and Spend
- **Mock data generator** — seeded, realistic, 90 days (generates data for ALL sections, not just MVP pages)
- **Unit + integration tests** — shared services, mock generator, key components
- **CI pipeline** — lint + typecheck + test on push

### Stretch Goals (build if time permits — architecture supports them)

- **Adoption & Enablement page** (FR-3) + MCP App UI
- **Quality & Autonomy page** (FR-4) + MCP App UI
- **Governance & Compliance page** (FR-5) + MCP App UI — simplified to event log table + policy block count
- **E2E tests** with Playwright
- **Dark mode**
- **Responsive tablet layout**

### Future (out of scope)

- **A2A (Agent-to-Agent) protocol support** — expose analytics via [A2A](https://a2a-protocol.org/) so customers' autonomous agents can query org-level stats programmatically (e.g., a cost-monitoring agent triggers alerts, a planning agent factors AI spend into sprint capacity). MCP covers human-to-agent; A2A covers agent-to-agent
- **AI chat with dynamic dashboard views** — embedded LLM chat in the web UI that generates custom visualizations from natural language queries (the MCP server already provides the data layer for this)
- Real backend integrations (GitHub/GitLab, CI providers, SSO)
- Real-time WebSocket updates
- Slack/email alerting on budget thresholds
- Per-role dashboards / RBAC
- CSV/PDF export
- Multi-organization support

### Success Criteria

By end of day 4, a reviewer should be able to:

1. **Open the web dashboard** in a browser → see Impact Summary with realistic mock data → navigate to Spend page → change filters and see charts update (Adoption, Quality, Governance pages available if stretch goals completed)
2. **Connect the MCP server** to Claude Desktop → ask "show me the cost breakdown by team for the last 30 days" → get a text summary AND an interactive chart that they can explore by changing filters
3. **Run `npm test`** → see passing unit and integration tests with meaningful coverage
4. **Run `npm run lint && npm run typecheck`** → clean output
5. **Read the specs/** directory → understand the product thinking, metric rationale, and technical decisions behind every choice

## 9. Assumptions & Constraints

- All data is mocked — no real backend integration
- Single organization view (no org switcher)
- English only
- Currency is USD
- Time saved estimates use a configurable hourly rate (default: $75/hr) and average time per task type
- Mock data: 90 days of history, 5 teams, 30 users, 3 LLM providers, 5 models
- Mock data is anchored to a fixed "now" (`2026-03-01T00:00:00Z`) — the 90-day window is Dec 1, 2025 – Feb 28, 2026. Sessions in the last 48 hours (Feb 27-28) have pending verification status
- Mock data includes both agent sessions (~15,000) and non-agent PRs (~3,000) to enable baseline comparisons (cycle time delta, agent contribution %)
- Mock data is seeded (deterministic) for stable tests
- Mock data models realistic patterns: weekday > weekend, S-curve adoption, team variance, cost-quality tradeoffs by model
- Autonomy levels, intervention counts, and revert data are modeled in mock sessions

## 10. Traceability Matrix

Maps requirements → technical spec → tests → implementation plan milestones.

| Requirement                   | Technical Spec Section                                                                                                                                       | Test Files                                                                      | Plan Milestone |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | -------------- |
| FR-1: Impact Summary          | §4 Data Model (ImpactSummarySchema, TrendSchema), §6 Service Layer (getImpactSummary), §7 Web Dashboard (routes/dashboard/index.tsx)                         | impact.test.ts, metric-card.test.tsx, dashboard-page.test.tsx, services.test.ts | M5, M7         |
| FR-2: Spend & Forecasting     | §4 Data Model (SpendBreakdownSchema, TeamSpendSchema, ModelSpendSchema), §6 Service Layer (getSpendBreakdown), §7 Web Dashboard (routes/dashboard/spend.tsx) | spend.test.ts, services.test.ts                                                 | M5, M8         |
| FR-3: Adoption & Enablement   | §4 Data Model (AdoptionMetricsSchema), §6 Service Layer (getAdoptionMetrics)                                                                                 | adoption.test.ts, services.test.ts                                              | M5, S1         |
| FR-4: Quality & Autonomy      | §4 Data Model (QualityMetricsSchema), §6 Service Layer (getQualityMetrics)                                                                                   | quality.test.ts, services.test.ts                                               | M5, S2         |
| FR-5: Governance & Compliance | §4 Data Model (GovernanceMetricsSchema), §6 Service Layer (getGovernanceMetrics)                                                                             | governance.test.ts, services.test.ts                                            | M5, S3         |
| FR-6: AI Callout              | §7 Web Dashboard (components/layout/ai-callout.tsx)                                                                                                          | ai-callout.test.tsx (inline in M11)                                             | M11            |
| FR-7: Filtering & Navigation  | §7 Web Dashboard (URL Search Params, URL→Filter Mapping, Routing)                                                                                            | date-range-picker.test.tsx, dashboard-page.test.tsx                             | M6             |
| FR-8: MCP Server              | §8 MCP Server (Tool Registration, Tool Inventory, App UI Flow)                                                                                               | mcp-tools.test.ts                                                               | M9, M10        |
| FR-9: Measurement Integrity   | §7 Component Design Principles (measurement badges), §4 Data Model (measurementTypes in all response schemas)                                                | metric-card.test.tsx, measurement-badge.test.tsx                                | M7             |
| NFR-1: Performance            | §12 Key Design Decisions (Vite + React)                                                                                                                      | (manual verification)                                                           | M12            |
| NFR-2: Responsiveness         | §7 Component Design Principles                                                                                                                               | (manual verification)                                                           | M12            |
| NFR-3: Accessibility          | §7 Component Design Principles                                                                                                                               | (manual verification)                                                           | M12            |
