import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from '@modelcontextprotocol/ext-apps/server';
import {
  AdoptionMetricsSchema,
  McpFiltersSchema,
  FiltersSchema,
  getAdoptionMetrics,
} from '@agentview/shared';
import { formatAdoptionSummary } from '../formatters/text.js';
import { applyDefaultFilters } from '../filters.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const DIST_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'dist', 'ui');

export function registerAdoptionTools(server: McpServer) {
  const resourceUri = 'ui://agentview/adoption';

  registerAppTool(
    server,
    'get_adoption_metrics',
    {
      title: 'Get Adoption Metrics',
      description:
        'Returns AI agent adoption and enablement metrics: activation funnel, time-to-value, DAU/WAU, capability adoption, and per-team usage comparison (with below-average teams highlighted). A single call with no teamIds filter already returns a breakdown for ALL teams — no need to call multiple times for comparison. Valid teamIds: team-platform, team-mobile, team-backend, team-frontend, team-data (or without "team-" prefix).',
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

  registerAppResource(
    server,
    'Adoption & Enablement',
    resourceUri,
    { description: 'Interactive Adoption & Enablement Dashboard' },
    () => {
      const html = readFileSync(join(DIST_DIR, 'adoption/mcp-app.html'), 'utf-8');
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
