import { describe, expect, it } from 'vitest';

import { ScpperClient } from '../../src/scp/scpperClient.js';

describe('ScpperClient', () => {
  it('gets unique author names from the fixed page endpoint', async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    const client = new ScpperClient({
      fetch: async (input, init) => {
        calls.push({ input, init });
        return new Response(
          JSON.stringify({
            authors: [
              { user: 'Moto42', role: 'Author' },
              { user: ' Moto42 ', role: 'Author' },
            ],
          }),
          { status: 200 },
        );
      },
    });

    await expect(client.getAuthorsByPageId('1956234')).resolves.toEqual([
      'Moto42',
    ]);
    expect(calls[0]?.input.toString()).toBe(
      'https://www.scpper.com/api/page?id=1956234',
    );
    expect(calls[0]?.init?.redirect).toBe('error');
  });

  it('returns no authors when SCPPER has no page attribution', async () => {
    const client = new ScpperClient({
      fetch: async () =>
        new Response(JSON.stringify({ error: 'Page not found' }), {
          status: 200,
        }),
    });

    await expect(client.getAuthorsByPageId('0')).resolves.toEqual([]);
  });
});
