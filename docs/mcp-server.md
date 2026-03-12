# MCP Server

## Start

```bash
npm run dev:mcp
```

Starts the server on [http://localhost:3001/mcp](http://localhost:3001/mcp) with file watching (auto-restarts on changes).

## Stop

```bash
npm run stop:mcp
```

## Configure in Claude Code

The project includes `.mcp.json` which auto-configures the server:

```json
{
  "mcpServers": {
    "agentview": {
      "type": "http",
      "url": "http://localhost:3001/mcp"
    }
  }
}
```

After starting the server, run `/mcp` in Claude Code to connect (or restart the session).

## Tools

| Tool | Type | Description |
|------|------|-------------|
| `get_impact_summary` | model-facing | Impact KPIs: cost per outcome, value-to-cost, cycle time, adoption |
| `get_spend_breakdown` | model-facing | Spend by team/model/time with budget utilization |
| `get_adoption_metrics` | model-facing | Activation funnel, DAU/WAU, capability adoption |
| `get_quality_metrics` | model-facing | Success rate, autonomy distribution, failure modes |
| `get_governance_summary` | model-facing | Policy blocks, security events, compliance stats |
| `poll_*_data` (5 tools) | app-only | Same data for MCP App UI refresh with changed filters |

All tools accept optional filters: `dateRange`, `teamIds`, `models`, `providers`.

## Example prompts

### Impact
```
How is our AI investment paying off? Show me the key metrics.
What's the cost per verified outcome for the Platform team in February?
Compare impact metrics between January and February.
```

### Spend
```
How much did we spend on AI agents last month? Break it down by team.
Which teams are over budget?
What's our spend on OpenAI vs Anthropic models?
Show me the Backend team's GPT-4o spending in the last 2 weeks.
```

### Adoption
```
How many developers are actively using AI agents?
Which capabilities are most popular — code gen, reviews, or testing?
What's the time-to-value for new users?
```

### Quality
```
What's our verified success rate? How often do we revert AI code?
What's the autonomy distribution — fully autonomous vs guided?
What are the top failure modes?
```

### Governance
```
Any security events this week?
How often are policy blocks happening?
Show me governance data for the Data team in the last 10 days.
```

### Cross-cutting
```
For the Mobile team using Claude Sonnet 4 in February — what's the success rate and spend?
Compare quality metrics for Gemini Flash vs GPT-4o this month.
```
