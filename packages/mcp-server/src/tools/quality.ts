import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from '@modelcontextprotocol/ext-apps/server';
import {
  QualityMetricsSchema,
  McpFiltersSchema,
  FiltersSchema,
  getQualityMetrics,
} from '@agentview/shared';
import { formatQualitySummary } from '../formatters/text.js';
import { applyDefaultFilters } from '../filters.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(__dirname, '..', '..', 'dist', 'ui');

export function registerQualityTools(server: McpServer) {
  const resourceUri = 'ui://agentview/quality';

  registerAppTool(
    server,
    'get_quality_metrics',
    {
      title: 'Get Quality Metrics',
      description:
        'Returns AI agent quality and autonomy metrics: verified success rate, autonomy distribution, intervention rate, revert rate, failure modes, and completion times',
      inputSchema: {
        dateRange: McpFiltersSchema.shape.dateRange,
        teamIds: McpFiltersSchema.shape.teamIds,
        models: McpFiltersSchema.shape.models,
        providers: McpFiltersSchema.shape.providers,
      },
      outputSchema: QualityMetricsSchema,
      _meta: { ui: { resourceUri } },
    },
    (params) => {
      const mcpFilters = McpFiltersSchema.parse(params);
      const filters = applyDefaultFilters(mcpFilters);
      const data = getQualityMetrics(filters);
      return {
        content: [{ type: 'text' as const, text: formatQualitySummary(data) }],
        structuredContent: data,
      };
    },
  );

  registerAppTool(
    server,
    'poll_quality_data',
    {
      title: 'Poll Quality Data',
      description: 'Returns quality data for UI polling with updated filters',
      inputSchema: {
        dateRange: FiltersSchema.shape.dateRange,
        teamIds: FiltersSchema.shape.teamIds,
        models: FiltersSchema.shape.models,
        providers: FiltersSchema.shape.providers,
      },
      outputSchema: QualityMetricsSchema,
      _meta: { ui: { resourceUri, visibility: ['app' as const] } },
    },
    (params) => {
      const filters = FiltersSchema.parse(params);
      const data = getQualityMetrics(filters);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data) }],
        structuredContent: data,
      };
    },
  );

  registerAppResource(
    server,
    'Quality & Autonomy',
    resourceUri,
    { description: 'Interactive Quality & Autonomy Dashboard' },
    () => {
      const html = readFileSync(join(DIST_DIR, 'quality/mcp-app.html'), 'utf-8');
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
