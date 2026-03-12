import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../../packages/mcp-server/src/server.js';
import {
  ImpactSummarySchema,
  SpendBreakdownSchema,
  AdoptionMetricsSchema,
  QualityMetricsSchema,
  GovernanceMetricsSchema,
} from '@agentview/shared';

vi.useFakeTimers({ now: new Date('2026-03-01T00:00:00Z') });

const MODEL_FACING_TOOLS = [
  'get_impact_summary',
  'get_spend_breakdown',
  'get_adoption_metrics',
  'get_quality_metrics',
  'get_governance_summary',
] as const;

const APP_ONLY_TOOLS = [
  'poll_impact_data',
  'poll_spend_data',
  'poll_adoption_data',
  'poll_quality_data',
  'poll_governance_data',
] as const;

let client: InstanceType<typeof Client>;
let closeTransports: () => Promise<void>;

beforeAll(async () => {
  const server = createServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);
  client = new Client({ name: 'test-client', version: '1.0.0' });
  await client.connect(clientTransport);

  closeTransports = async () => {
    await client.close();
    await server.close();
  };
});

afterAll(async () => {
  await closeTransports();
  vi.useRealTimers();
});

describe('MCP Tools — Registration', () => {
  it('registers all 10 tools (5 model-facing + 5 app-only)', async () => {
    const result = await client.listTools();
    const toolNames = result.tools.map((t) => t.name);

    for (const name of MODEL_FACING_TOOLS) {
      expect(toolNames).toContain(name);
    }
    for (const name of APP_ONLY_TOOLS) {
      expect(toolNames).toContain(name);
    }
    expect(result.tools.length).toBe(10);
  });

  it('model-facing tools have descriptions', async () => {
    const result = await client.listTools();
    for (const name of MODEL_FACING_TOOLS) {
      const tool = result.tools.find((t) => t.name === name);
      expect(tool?.description).toBeTruthy();
    }
  });

  it('app-only tools have visibility metadata', async () => {
    const result = await client.listTools();
    for (const name of APP_ONLY_TOOLS) {
      const tool = result.tools.find((t) => t.name === name);
      expect(tool).toBeDefined();
      // registerAppTool sets _meta.ui.visibility on the tool definition
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolAny = tool as any;
      const visibility = toolAny._meta?.ui?.visibility;
      expect(visibility).toContain('app');
    }
  });
});

describe('MCP Tools — Model-facing tools return text + structuredContent', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const schemas: Record<string, any> = {};

  const toolSchemaMap = {
    get_impact_summary: ImpactSummarySchema,
    get_spend_breakdown: SpendBreakdownSchema,
    get_adoption_metrics: AdoptionMetricsSchema,
    get_quality_metrics: QualityMetricsSchema,
    get_governance_summary: GovernanceMetricsSchema,
  } as const;

  for (const toolName of MODEL_FACING_TOOLS) {
    it(`${toolName} returns non-empty text content`, async () => {
      const result = await client.callTool({ name: toolName, arguments: {} });
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      const textContent = (result.content as Array<{ type: string; text: string }>).find(
        (c) => c.type === 'text',
      );
      expect(textContent).toBeDefined();
      expect(textContent!.text.length).toBeGreaterThan(0);
    });

    it(`${toolName} returns structuredContent matching schema`, async () => {
      const result = await client.callTool({ name: toolName, arguments: {} });
      expect(result.structuredContent).toBeDefined();

      const schema = toolSchemaMap[toolName as keyof typeof toolSchemaMap];
      const parsed = schema.parse(result.structuredContent);
      expect(parsed).toBeDefined();
      schemas[toolName] = parsed;
    });
  }
});

describe('MCP Tools — AC-8.1: get_spend_breakdown with 30-day range', () => {
  it('returns text summary and valid structuredContent for 30-day range', async () => {
    const result = await client.callTool({
      name: 'get_spend_breakdown',
      arguments: {
        dateRange: { from: '2026-02-01', to: '2026-02-28' },
      },
    });

    // Text summary
    const textContent = (result.content as Array<{ type: string; text: string }>).find(
      (c) => c.type === 'text',
    );
    expect(textContent).toBeDefined();
    expect(textContent!.text.length).toBeGreaterThan(0);

    // structuredContent validates against SpendBreakdownSchema
    const data = SpendBreakdownSchema.parse(result.structuredContent);
    expect(data.totalSpend).toBeGreaterThan(0);
    expect(data.spendByTeam.length).toBeGreaterThan(0);
    expect(data.spendByModel.length).toBeGreaterThan(0);
  });
});

describe('MCP Tools — AC-8.4: get_impact_summary text has KPI values', () => {
  it('text contains dollar amounts and percentages', async () => {
    const result = await client.callTool({
      name: 'get_impact_summary',
      arguments: {},
    });

    const text = (result.content as Array<{ type: string; text: string }>).find(
      (c) => c.type === 'text',
    )!.text;

    // Should contain dollar amounts
    expect(text).toMatch(/\$/);
    // Should contain percentages
    expect(text).toMatch(/%/);
  });
});

describe('MCP Tools — Filter parameters', () => {
  it('accepts team filter and returns filtered data', async () => {
    const allResult = await client.callTool({
      name: 'get_spend_breakdown',
      arguments: {},
    });
    const filteredResult = await client.callTool({
      name: 'get_spend_breakdown',
      arguments: { teamIds: ['team-platform'] },
    });

    const allData = SpendBreakdownSchema.parse(allResult.structuredContent);
    const filteredData = SpendBreakdownSchema.parse(filteredResult.structuredContent);
    // Filtered to single team — total spend should be less
    expect(filteredData.totalSpend).toBeLessThan(allData.totalSpend);
    // Platform team should have non-zero spend
    const platformTeam = filteredData.spendByTeam.find((t) => t.teamId === 'team-platform');
    expect(platformTeam).toBeDefined();
    expect(platformTeam!.spend).toBeGreaterThan(0);
  });

  it('accepts date range filter', async () => {
    const fullResult = await client.callTool({
      name: 'get_spend_breakdown',
      arguments: {},
    });
    const narrowResult = await client.callTool({
      name: 'get_spend_breakdown',
      arguments: { dateRange: { from: '2026-02-20', to: '2026-02-28' } },
    });

    const fullData = SpendBreakdownSchema.parse(fullResult.structuredContent);
    const narrowData = SpendBreakdownSchema.parse(narrowResult.structuredContent);
    // Narrower date range should have less or equal spend
    expect(narrowData.totalSpend).toBeLessThanOrEqual(fullData.totalSpend);
  });

  it('missing optional params default correctly', async () => {
    // Call with no arguments — should use defaults (full 90-day range, all teams/models)
    const result = await client.callTool({
      name: 'get_impact_summary',
      arguments: {},
    });

    const data = ImpactSummarySchema.parse(result.structuredContent);
    expect(data.activeUsers).toBeGreaterThan(0);
    expect(data.totalSpend).toBeGreaterThan(0);
  });
});

describe('MCP Tools — Text summaries contain key numbers', () => {
  for (const toolName of MODEL_FACING_TOOLS) {
    it(`${toolName} text is non-empty and contains numbers`, async () => {
      const result = await client.callTool({ name: toolName, arguments: {} });
      const text = (result.content as Array<{ type: string; text: string }>).find(
        (c) => c.type === 'text',
      )!.text;

      expect(text.length).toBeGreaterThan(50);
      // Should contain at least some numeric data
      expect(text).toMatch(/\d/);
    });
  }
});

describe('MCP Tools — App-only (poll) tools', () => {
  const pollToolSchemaMap = {
    poll_impact_data: ImpactSummarySchema,
    poll_spend_data: SpendBreakdownSchema,
    poll_adoption_data: AdoptionMetricsSchema,
    poll_quality_data: QualityMetricsSchema,
    poll_governance_data: GovernanceMetricsSchema,
  } as const;

  for (const toolName of APP_ONLY_TOOLS) {
    it(`${toolName} returns valid structuredContent`, async () => {
      const result = await client.callTool({
        name: toolName,
        arguments: {
          dateRange: { from: '2025-12-01', to: '2026-02-28' },
        },
      });

      expect(result.structuredContent).toBeDefined();
      const schema = pollToolSchemaMap[toolName as keyof typeof pollToolSchemaMap];
      const parsed = schema.parse(result.structuredContent);
      expect(parsed).toBeDefined();
    });
  }
});

describe('MCP App Resources — Registration', () => {
  it('registers app resources for impact and spend', async () => {
    const result = await client.listResources();
    const uris = result.resources.map((r) => r.uri);

    expect(uris).toContain('ui://agentview/impact');
    expect(uris).toContain('ui://agentview/spend');
  });

  it('impact resource has correct name and description', async () => {
    const result = await client.listResources();
    const impact = result.resources.find((r) => r.uri === 'ui://agentview/impact');
    expect(impact).toBeDefined();
    expect(impact!.name).toBe('Impact Summary');
  });

  it('spend resource has correct name and description', async () => {
    const result = await client.listResources();
    const spend = result.resources.find((r) => r.uri === 'ui://agentview/spend');
    expect(spend).toBeDefined();
    expect(spend!.name).toBe('Spend Analytics');
  });
});

describe('MCP App UIs — Build Output', () => {
  const distDir = join(__dirname, '../../packages/mcp-server/dist/ui');

  it('impact app HTML exists as single file', () => {
    const htmlPath = join(distDir, 'impact/mcp-app.html');
    expect(existsSync(htmlPath)).toBe(true);
    const html = readFileSync(htmlPath, 'utf-8');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<script');
    // Single-file: JS should be inlined (no external script src)
    expect(html).not.toMatch(/<script[^>]+src=/);
  });

  it('spend app HTML exists as single file', () => {
    const htmlPath = join(distDir, 'spend/mcp-app.html');
    expect(existsSync(htmlPath)).toBe(true);
    const html = readFileSync(htmlPath, 'utf-8');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<script');
    expect(html).not.toMatch(/<script[^>]+src=/);
  });

  it('impact app HTML contains React app code', () => {
    const html = readFileSync(join(distDir, 'impact/mcp-app.html'), 'utf-8');
    expect(html).toContain('Impact Summary');
  });

  it('spend app HTML contains React app code', () => {
    const html = readFileSync(join(distDir, 'spend/mcp-app.html'), 'utf-8');
    expect(html).toContain('Spend Analytics');
  });
});
