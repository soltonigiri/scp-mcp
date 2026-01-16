import { randomUUID } from 'node:crypto';

import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import type { Request, Response } from 'express';

import { createScpMcpServer } from '../mcp/scpMcpServer.js';
import { ScpDataApiClient } from '../scp/dataApiClient.js';
import { ScpRepository } from '../scp/repository.js';

type Session = {
  transport: StreamableHTTPServerTransport;
  server: ReturnType<typeof createScpMcpServer>;
};

const api = new ScpDataApiClient();
const repo = new ScpRepository(api);

const sessions = new Map<string, Session>();

const app = createMcpExpressApp();

app.get('/healthz', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.post('/mcp', async (req: Request, res: Response) => {
  const sessionIdHeader = req.headers['mcp-session-id'];
  const sessionId =
    typeof sessionIdHeader === 'string' ? sessionIdHeader : undefined;

  try {
    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId) as Session;
      await session.transport.handleRequest(req, res, req.body);
      return;
    }

    if (!sessionId && isInitializeRequest(req.body)) {
      const server = createScpMcpServer(repo);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          sessions.set(sid, { transport, server });
        },
      });

      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid) sessions.delete(sid);
        server.close();
      };

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    }

    res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Bad Request: No valid session ID provided',
      },
      id: null,
    });
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

app.get('/mcp', async (_req: Request, res: Response) => {
  res.writeHead(405).end(
    JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Method not allowed.',
      },
      id: null,
    }),
  );
});

app.delete('/mcp', async (req: Request, res: Response) => {
  const sessionIdHeader = req.headers['mcp-session-id'];
  const sessionId =
    typeof sessionIdHeader === 'string' ? sessionIdHeader : undefined;
  if (!sessionId || !sessions.has(sessionId)) {
    res.status(404).json({ ok: false, error: 'Unknown session' });
    return;
  }

  const session = sessions.get(sessionId) as Session;
  sessions.delete(sessionId);
  await session.transport.close();
  session.server.close();
  res.json({ ok: true });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, (error?: unknown) => {
  if (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
  console.log(`scp-mcp: Streamable HTTP server listening on port ${port}`);
});

process.on('SIGINT', async () => {
  for (const [sid, session] of sessions.entries()) {
    try {
      await session.transport.close();
      session.server.close();
    } catch (e) {
      console.error(`Error closing session ${sid}:`, e);
    } finally {
      sessions.delete(sid);
    }
  }
  process.exit(0);
});
