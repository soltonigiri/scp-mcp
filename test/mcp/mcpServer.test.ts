import { describe, expect, it, vi } from 'vitest';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { createScpMcpServer } from '../../src/mcp/scpMcpServer.js';
import { ScpRepository } from '../../src/scp/repository.js';

function createItemsRepo() {
  const index = {
    'SCP-173': {
      content_file: 'content_series-1.json',
      link: 'scp-173',
      title: 'SCP-173',
      url: 'https://scp-wiki.wikidot.com/scp-173',
      page_id: 1956234,
      rating: 2,
      tags: ['euclid'],
      created_at: '2008-07-25T20:49:00',
      creator: 'Author B',
      references: [],
      hubs: [],
      images: [],
      history: [{ author: 'Author B' }],
      series: 'series-1',
      scp_number: 173,
    },
  } as const;

  const contentSeries1 = {
    'SCP-173': {
      link: 'scp-173',
      title: 'SCP-173',
      url: 'https://scp-wiki.wikidot.com/scp-173',
      page_id: '1956234',
      rating: 2,
      tags: ['euclid'],
      series: 'series-1',
      created_at: '2008-07-25T20:49:00',
      creator: 'Author B',
      raw_content:
        '<html><body><div id="page-content"><p>A statue that moves when not observed.</p></div></body></html>',
      raw_source: 'A statue that moves when not observed.',
      images: [],
      references: [],
      hubs: [],
      history: [{ author: 'Author B' }],
      scp_number: 173,
    },
  } as const;

  return new ScpRepository(
    {
      getIndex: async (collection) => {
        if (collection !== 'items') return {};
        return index as unknown as Record<string, unknown>;
      },
      getContentIndexFor: async (collection) => {
        if (collection !== 'items') return {};
        return { 'series-1': 'content_series-1.json' };
      },
      getContentFileFor: async (collection, fileName) => {
        if (collection !== 'items') return {};
        if (fileName !== 'content_series-1.json') return {};
        return contentSeries1 as unknown as Record<string, unknown>;
      },
    },
    { collections: ['items'] },
  );
}

describe('scp-mcp server', () => {
  it('supports tools/list and tools/call (in-memory transport)', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const repo = createItemsRepo();
      const server = createScpMcpServer(repo);

      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
      const client = new Client({ name: 'test-client', version: '0.0.0' });

      await server.connect(serverTransport);
      await client.connect(clientTransport);

      const tools = await client.listTools();
      const names = tools.tools.map((t) => t.name);
      expect(names).toEqual(
        expect.arrayContaining([
          'scp_search',
          'scp_get_page',
          'scp_get_content',
          'scp_get_related',
          'scp_get_attribution',
        ]),
      );

      const result = await client.callTool({
        name: 'scp_get_attribution',
        arguments: { link: 'scp-173' },
      });

      const sc = result.structuredContent as Record<string, unknown> | undefined;
      expect(sc?.license).toBeTruthy();
    } finally {
      consoleError.mockRestore();
    }
  });
});

