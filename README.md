# AgentView

[![CI](https://github.com/nesquikm/zchw/actions/workflows/ci.yml/badge.svg)](https://github.com/nesquikm/zchw/actions/workflows/ci.yml) ![TypeScript](<https://img.shields.io/badge/TypeScript-5_(strict)-blue>) ![React](https://img.shields.io/badge/React-19-61dafb) ![MCP](https://img.shields.io/badge/MCP-6_tools_+_5_apps-8b5cf6) ![Vite](https://img.shields.io/badge/Vite-7-646cff)

**Organizational analytics for AI coding agents.** One dashboard that answers: _"Is our AI investment paying off?"_ and _"Where should we invest more?"_

Three interfaces to the same data — all powered by one shared service layer:

```
                    ┌──────────────────┐
                    │   Shared Layer   │
                    │  Zod schemas     │
                    │  Mock generator  │
                    │  5 services      │
                    │  Utility fns     │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼───────┐ ┌───▼──────────┐ ┌─▼────────────┐
     │  Web Dashboard │ │  MCP Server  │ │ A2A Protocol │
     │ React SPA      │ │ 6 tools      │ │ (future)     │
     │ 5 pages        │ │ 5 MCP Apps   │ │              │
     └────────────────┘ └──────────────┘ └──────────────┘
```

---

## Web Dashboard

> Full-featured SPA with interactive charts, filterable by date range, team, and model. Five pages covering impact, spend, adoption, quality, and governance.

![Web Dashboard](docs/assets/demo-web.gif)

## MCP Apps (Claude Desktop)

> Ask questions in natural language and get interactive charts back. The AI pre-fills your query parameters, then you can freely explore without further LLM round-trips.

![MCP Apps in Claude Desktop](docs/assets/demo-mcp-apps.gif)

## MCP Tools (Claude Code)

> Same analytics, text-based. Works in any MCP client — no UI required. Filter by team, model, provider, or date range through conversation.

![MCP in Claude Code](docs/assets/demo-mcp-text.gif)

## A2A Protocol (Future)

The MCP server already exposes analytics over HTTP. Adding [A2A](https://google.github.io/A2A/) would let autonomous agents query organizational metrics programmatically — a cost-monitoring agent triggers budget alerts, a planning agent factors AI spend into sprint capacity, a compliance agent audits governance events on a schedule.

MCP covers human → agent. A2A covers agent → agent. Together, they make AgentView a node in any agentic system.

---

## Dashboard Pages

### Impact Summary — _the North Star page_

Six KPIs that tell the investment story: **cost per verified outcome** (fully-loaded, includes failed sessions), value-to-cost ratio, cycle time delta vs. non-agent baseline, agent contribution %, active users, and verified outcomes. Every metric is labeled **Observed** (from git/CI events) or **Estimated** (model-derived with stated assumptions).

### Spend & Forecasting

Spend over time with linear month-end projection, budget utilization per team (with alerts at 85%+), cost drivers breakdown, cost-per-outcome by model (the cost-quality tradeoff), and a spend-by-model distribution chart.

### Adoption & Enablement

Activation funnel (invited → activated → first outcome → regular user), DAU/WAU over time, capability adoption heatmap (code gen, review, testing, debugging, docs, refactoring), and a team health table that highlights **where AI is failing** — not just where it's succeeding.

### Quality & Autonomy

Autonomy level distribution (L1 Guided → L2 Supervised → L3 Autonomous), verified success rate, intervention and revert rates, failure mode breakdown (agent error, infra, policy block, test failure, human abandoned), and completion time at p50/p95.

### Governance & Compliance

Security event severity distribution over time, scrollable event log, access scope audit (what repos/services agents touched), and policy compliance stats (block rate, override rate, top violated policies).

> **More details:** [Web Dashboard Guide](docs/web-dashboard.md) · [MCP Server Guide](docs/mcp-server.md)

---

## Synthetic Data Engine

All data is deterministic and seed-stable — no external services, no flaky tests.

| Parameter    | Value                                             |
| ------------ | ------------------------------------------------- |
| PRNG         | mulberry32 (seeded)                               |
| Default seed | 42                                                |
| Time anchor  | `2026-03-01T00:00:00Z`                            |
| Window       | 90 days (Dec 1, 2025 — Feb 28, 2026)              |
| Organization | 1 org, 5 teams, 30 users                          |
| Models       | 3 providers (Anthropic, OpenAI, Google), 5 models |
| Sessions     | ~15,000 agent sessions                            |
| Baselines    | ~3,000 non-agent PRs (for cycle time comparison)  |
| Security     | ~500 governance events                            |

Same seed always produces the same dashboard. Change the seed, get a different but equally coherent organization. Tests run across multiple seeds `[42, 123, 999, 7777, 31415]` to validate invariants that hold for any generated dataset.

Realistic patterns baked in: weekday > weekend traffic (3–5x), S-curve user activation, team variance in adoption rates (3x+), model cost-quality tradeoffs, autonomy progression over time, and a 48-hour verification window where recent PRs remain pending.

---

## Development Process

Built with **Spec-Driven Development (SDD)** — an AI-first methodology where specs are written before code, and AI agents execute against an approved blueprint.

### Spec Precedence

[requirements.md](specs/requirements.md) > [testing-spec.md](specs/testing-spec.md) > [technical-spec.md](specs/technical-spec.md) > [plan.md](specs/plan.md)

If implementation contradicts a spec, the spec wins. Deviations are marked `SPEC_DEVIATION: [reason]` in code. Specs are enforced as read-only by a [Claude Code hook](.claude/settings.json) that blocks edits to `specs/`. See also the original [assignment brief](specs/assignment.md).

### TDD Cycle

Every feature follows: **Schema** (Zod) → **RED** (failing tests) → **GREEN** (implement) → **VERIFY** (gate check) → **Refactor**

Gate check runs after every milestone: `npm run typecheck && npm run lint && npm run test`

### 16 Milestones

| Phase      | Milestones     | What                                                              |
| ---------- | -------------- | ----------------------------------------------------------------- |
| Foundation | M1–M3          | Monorepo scaffolding, Zod schemas, mock data generator (64 tests) |
| Services   | M4–M5          | Utility functions, 5 analytics services                           |
| Web Shell  | M6             | Layout, TanStack Router, filter bar with URL sync                 |
| Dashboard  | M7–M8, M13–M15 | Impact, Spend, Adoption, Quality, Governance pages                |
| MCP        | M9–M10         | 6 model-facing tools, 5 app-only tools, 5 interactive MCP App UIs |
| Polish     | M11–M12, M16   | AI integration banner, CI green, metadata tool, glossary tooltips |

### Cross-Model Evaluation

- **[mcp-rubber-duck](https://github.com/flesler/mcp-rubber-duck)** — asked other LLMs (GPT-5.2, Gemini 3 Flash) to review code, debate architectural decisions, and vote on implementation approaches. Also served as middleware between Claude Code and Chrome for visual verification of UI components via the `/visual-check` skill.

### Claude Code Skills

| Skill                                                   | Description                                                       |
| ------------------------------------------------------- | ----------------------------------------------------------------- |
| [`/milestone`](.claude/skills/milestone/SKILL.md)       | Execute a full milestone end-to-end in TDD order with gate checks |
| [`/tdd`](.claude/skills/tdd/SKILL.md)                   | RED (failing test) → GREEN (implement) → VERIFY (gates pass)      |
| [`/gate-check`](.claude/skills/gate-check/SKILL.md)     | Run typecheck + lint + test and report results                    |
| [`/spec-review`](.claude/skills/spec-review/SKILL.md)   | Audit implementation against specs for deviations                 |
| [`/visual-check`](.claude/skills/visual-check/SKILL.md) | Visually verify UI via rubber duck + Chrome browser               |

> **More details:** [Development Process](docs/development-process.md) · [Web Dashboard](docs/web-dashboard.md) · [MCP Server](docs/mcp-server.md)

---

## Tech Stack

| Layer      | Technology                                                            |
| ---------- | --------------------------------------------------------------------- |
| Language   | TypeScript 5 (strict mode, no `any`)                                  |
| Build      | Vite 7, npm workspaces                                                |
| Web        | React 19, TanStack Router, TanStack Query, Tailwind CSS 4, Recharts 3 |
| MCP        | @modelcontextprotocol/sdk, stdio + HTTP transport                     |
| Validation | Zod 4 — schemas are the single contract between all layers            |
| Testing    | Vitest 4, React Testing Library, 654 tests across 41 files            |

---

## Project Structure

```
packages/
├── shared/            # Zod schemas, mock data generator, services, utils
├── web/               # React SPA — 5 dashboard pages
└── mcp-server/        # 6 tools, 5 MCP App UIs, text formatters
specs/                 # Source of truth (requirements, plan, technical, testing)
tests/                 # 654 tests across 41 files
docs/                  # Usage guides
.claude/skills/        # AI-assisted development skills
```

---

## Quick Start

```bash
git clone https://github.com/nesquikm/zchw.git && cd zchw
npm install

# Web dashboard → localhost:5173
npm run dev:web

# MCP server → localhost:3001/mcp
npm run dev:mcp

# Run all checks
npm run typecheck && npm run lint && npm run test
```
