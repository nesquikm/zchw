import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppTool } from '@modelcontextprotocol/ext-apps/server';
import {
  AdoptionMetricsSchema,
  McpFiltersSchema,
  FiltersSchema,
  getAdoptionMetrics,
} from '@agentview/shared';
import { formatAdoptionSummary } from '../formatters/text.js';
import { applyDefaultFilters } from '../filters.js';

export function registerAdoptionTools(server: McpServer) {
  const resourceUri = 'ui://agentview/adoption';

  registerAppTool(
    server,
    'get_adoption_metrics',
    {
      title: 'Get Adoption Metrics',
      description:
        'Returns AI agent adoption and enablement metrics: activation funnel, time-to-value, DAU/WAU, capability adoption, and team usage',
      inputSchema: {
        dateRange: McpFiltersSchema.shape.dateRange,
        teamIds: McpFiltersSchema.shape.teamIds,
        models: McpFiltersSchema.shape.models,
        providers: McpFiltersSchema.shape.providers,
      },
      outputSchema: AdoptionMetricsSchema,
      _meta: { ui: { resourceUri } },
    },
    (params) => {
      const mcpFilters = McpFiltersSchema.parse(params);
      const filters = applyDefaultFilters(mcpFilters);
      const data = getAdoptionMetrics(filters);
      return {
        content: [{ type: 'text' as const, text: formatAdoptionSummary(data) }],
        structuredContent: data,
      };
    },
  );

  registerAppTool(
    server,
    'poll_adoption_data',
    {
      title: 'Poll Adoption Data',
      description: 'Returns adoption data for UI polling with updated filters',
      inputSchema: {
        dateRange: FiltersSchema.shape.dateRange,
        teamIds: FiltersSchema.shape.teamIds,
        models: FiltersSchema.shape.models,
        providers: FiltersSchema.shape.providers,
      },
      outputSchema: AdoptionMetricsSchema,
      _meta: { ui: { resourceUri, visibility: ['app' as const] } },
    },
    (params) => {
      const filters = FiltersSchema.parse(params);
      const data = getAdoptionMetrics(filters);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data) }],
        structuredContent: data,
      };
    },
  );
}
