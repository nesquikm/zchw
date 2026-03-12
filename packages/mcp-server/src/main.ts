import { createServer } from './server.js';

if (process.argv.includes('--http')) {
  const { createServer: createHttpServer } = await import('node:http');
  const { StreamableHTTPServerTransport } =
    await import('@modelcontextprotocol/sdk/server/streamableHttp.js');
  const { randomUUID } = await import('node:crypto');

  // Track transports by session ID so multiple clients can connect
  const transports = new Map<string, InstanceType<typeof StreamableHTTPServerTransport>>();

  const httpServer = createHttpServer(async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    if (sessionId && transports.has(sessionId)) {
      // Existing session — route to its transport
      await transports.get(sessionId)!.handleRequest(req, res);
    } else if (req.method === 'POST') {
      // New session — create transport + server pair
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
      });
      const server = createServer();
      await server.connect(transport);
      await transport.handleRequest(req, res);

      if (transport.sessionId) {
        transports.set(transport.sessionId, transport);
        transport.onclose = () => {
          transports.delete(transport.sessionId!);
        };
      }
    } else {
      res.writeHead(405).end('Method not allowed');
    }
  });

  httpServer.listen(3001, () => {
    console.log('MCP server listening on http://localhost:3001/mcp');
  });
} else {
  const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
  const transport = new StdioServerTransport();
  const server = createServer();
  await server.connect(transport);
}
