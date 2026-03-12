import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from '@modelcontextprotocol/ext-apps/server';
import {
  SpendBreakdownSchema,
  McpFiltersSchema,
  FiltersSchema,
  getSpendBreakdown,
} from '@agentview/shared';
import { formatSpendSummary } from '../formatters/text.js';
import { applyDefaultFilters } from '../filters.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const DIST_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'dist', 'ui');

export function registerSpendTools(server: McpServer) {
  const resourceUri = 'ui://agentview/spend';

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
      const filters = applyDefaultFilters(mcpFilters);
      const data = getSpendBreakdown(filters);
      return {
        content: [{ type: 'text' as const, text: formatSpendSummary(data) }],
        structuredContent: data,
      };
    },
  );

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
      _meta: { ui: { resourceUri, visibility: ['app' as const] } },
    },
    (params) => {
      const filters = FiltersSchema.parse(params);
      const data = getSpendBreakdown(filters);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data) }],
        structuredContent: data,
      };
    },
  );

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
