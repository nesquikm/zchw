import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppTool } from '@modelcontextprotocol/ext-apps/server';
import {
  GovernanceMetricsSchema,
  McpFiltersSchema,
  FiltersSchema,
  getGovernanceMetrics,
} from '@agentview/shared';
import { formatGovernanceSummary } from '../formatters/text.js';
import { applyDefaultFilters } from '../filters.js';

export function registerGovernanceTools(server: McpServer) {
  const resourceUri = 'ui://agentview/governance';

  registerAppTool(
    server,
    'get_governance_summary',
    {
      title: 'Get Governance Summary',
      description:
        'Returns AI agent governance and compliance metrics: policy block rate, override rate, violated policies, sensitive data stats, and security event log',
      inputSchema: {
        dateRange: McpFiltersSchema.shape.dateRange,
        teamIds: McpFiltersSchema.shape.teamIds,
        models: McpFiltersSchema.shape.models,
        providers: McpFiltersSchema.shape.providers,
      },
      outputSchema: GovernanceMetricsSchema,
      _meta: { ui: { resourceUri } },
    },
    (params) => {
      const mcpFilters = McpFiltersSchema.parse(params);
      const filters = applyDefaultFilters(mcpFilters);
      const data = getGovernanceMetrics(filters);
      return {
        content: [{ type: 'text' as const, text: formatGovernanceSummary(data) }],
        structuredContent: data,
      };
    },
  );

  registerAppTool(
    server,
    'poll_governance_data',
    {
      title: 'Poll Governance Data',
      description: 'Returns governance data for UI polling with updated filters',
      inputSchema: {
        dateRange: FiltersSchema.shape.dateRange,
        teamIds: FiltersSchema.shape.teamIds,
        models: FiltersSchema.shape.models,
        providers: FiltersSchema.shape.providers,
      },
      outputSchema: GovernanceMetricsSchema,
      _meta: { ui: { resourceUri, visibility: ['app' as const] } },
    },
    (params) => {
      const filters = FiltersSchema.parse(params);
      const data = getGovernanceMetrics(filters);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data) }],
        structuredContent: data,
      };
    },
  );
}
