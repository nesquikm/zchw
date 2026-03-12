import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppTool } from '@modelcontextprotocol/ext-apps/server';
import {
  ImpactSummarySchema,
  McpFiltersSchema,
  FiltersSchema,
  getImpactSummary,
} from '@agentview/shared';
import { formatImpactSummary } from '../formatters/text.js';
import { applyDefaultFilters } from '../filters.js';

export function registerImpactTools(server: McpServer) {
  const resourceUri = 'ui://agentview/impact';

  registerAppTool(
    server,
    'get_impact_summary',
    {
      title: 'Get Impact Summary',
      description:
        'Returns AI agent impact summary KPIs: cost per verified outcome, value-to-cost ratio, cycle time delta, agent contribution %, active users, and verified outcomes',
      inputSchema: {
        dateRange: McpFiltersSchema.shape.dateRange,
        teamIds: McpFiltersSchema.shape.teamIds,
        models: McpFiltersSchema.shape.models,
        providers: McpFiltersSchema.shape.providers,
      },
      outputSchema: ImpactSummarySchema,
      _meta: { ui: { resourceUri } },
    },
    (params) => {
      const mcpFilters = McpFiltersSchema.parse(params);
      const filters = applyDefaultFilters(mcpFilters);
      const data = getImpactSummary(filters);
      return {
        content: [{ type: 'text' as const, text: formatImpactSummary(data) }],
        structuredContent: data,
      };
    },
  );

  registerAppTool(
    server,
    'poll_impact_data',
    {
      title: 'Poll Impact Data',
      description: 'Returns impact data for UI polling with updated filters',
      inputSchema: {
        dateRange: FiltersSchema.shape.dateRange,
        teamIds: FiltersSchema.shape.teamIds,
        models: FiltersSchema.shape.models,
        providers: FiltersSchema.shape.providers,
      },
      outputSchema: ImpactSummarySchema,
      _meta: { ui: { resourceUri, visibility: ['app' as const] } },
    },
    (params) => {
      const filters = FiltersSchema.parse(params);
      const data = getImpactSummary(filters);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data) }],
        structuredContent: data,
      };
    },
  );
}
