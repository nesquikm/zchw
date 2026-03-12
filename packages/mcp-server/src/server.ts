import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerImpactTools } from './tools/impact.js';
import { registerSpendTools } from './tools/spend.js';
import { registerAdoptionTools } from './tools/adoption.js';
import { registerQualityTools } from './tools/quality.js';
import { registerGovernanceTools } from './tools/governance.js';
import { registerMetadataTools } from './tools/metadata.js';

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'agentview',
    version: '0.0.1',
  });

  registerImpactTools(server);
  registerSpendTools(server);
  registerAdoptionTools(server);
  registerQualityTools(server);
  registerGovernanceTools(server);
  registerMetadataTools(server);

  return server;
}
