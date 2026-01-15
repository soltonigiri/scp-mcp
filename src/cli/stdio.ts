import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { createScpMcpServer } from '../mcp/scpMcpServer.js';
import { ScpDataApiClient } from '../scp/dataApiClient.js';
import { ScpRepository } from '../scp/repository.js';

async function main() {
  const api = new ScpDataApiClient();
  const repo = new ScpRepository(api);

  const server = createScpMcpServer(repo);
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('scp-mcp: stdio server running');
}

main().catch((error) => {
  console.error('scp-mcp: stdio server error:', error);
  process.exit(1);
});

