import { describe, expect, it } from 'vitest';

import { ScpDataApiClient } from '../../src/scp/dataApiClient.js';

describe('ScpDataApiClient', () => {
  it('rejects non-allowlisted origins (SSRF protection)', async () => {
    const client = new ScpDataApiClient({
      fetch: async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    });

    await expect(
      client.getJsonByUrl('https://example.com/data/scp/items/index.json'),
    ).rejects.toThrow(/not allowlisted/i);
  });

  it('uses ETag/Last-Modified for in-memory strong caching', async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    const etag = '"abc"';
    const lastModified = 'Thu, 15 Jan 2026 02:19:07 GMT';

    const client = new ScpDataApiClient({
      fetch: async (input, init) => {
        calls.push({ input, init });

        if (calls.length === 1) {
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { ETag: etag, 'Last-Modified': lastModified },
          });
        }

        return new Response(null, { status: 304 });
      },
    });

    const url = 'https://scp-data.tedivm.com/data/scp/items/index.json';
    const first = await client.getJsonByUrl<{ ok: boolean }>(url);
    const second = await client.getJsonByUrl<{ ok: boolean }>(url);

    expect(first).toEqual({ ok: true });
    expect(second).toEqual({ ok: true });

    const secondHeaders = calls[1]?.init?.headers;
    expect(secondHeaders).toBeTruthy();

    const h = secondHeaders as Record<string, string>;
    expect(h['If-None-Match']).toBe(etag);
    expect(h['If-Modified-Since']).toBe(lastModified);
  });
});

