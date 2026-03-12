import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MetadataSchema, getMetadata } from '@agentview/shared';
import { formatMetadata } from '../formatters/metadata.js';

export function registerMetadataTools(server: McpServer) {
  server.registerTool(
    'get_metadata',
    {
      title: 'Get Metadata',
      description:
        'Returns organization reference data: teams, models, providers, task types, autonomy levels, and available date range. Use this to discover valid filter values for other tools.',
      outputSchema: MetadataSchema,
    },
    () => {
      const data = getMetadata();
      return {
        content: [{ type: 'text' as const, text: formatMetadata(data) }],
        structuredContent: data,
      };
    },
  );
}
