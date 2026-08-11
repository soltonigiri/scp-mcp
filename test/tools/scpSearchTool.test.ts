import { describe, expect, it } from 'vitest';

import { ScpRepository } from '../../src/scp/repository.js';
import { scpSearchToolCall } from '../../src/tools/scpSearch.js';

describe('scp_search tool', () => {
  it('returns results with license and attribution', async () => {
    const repo = new ScpRepository(
      {
        getIndex: async () => ({
          'SCP-173': {
            link: 'scp-173',
            title: 'SCP-173',
            url: 'https://scp-wiki.wikidot.com/scp-173',
            page_id: '1956234',
            rating: 100,
            tags: ['euclid', 'sculpture'],
            series: 'series-1',
            created_at: '2008-07-25T20:49:00',
            creator: 'Test',
          },
        }),
        getContentIndexFor: async () => {
          throw new Error('content index must not be loaded for search');
        },
        getContentFileFor: async () => {
          throw new Error('content file must not be loaded for search');
        },
      },
      { collections: ['items'] },
    );

    const res = await scpSearchToolCall(repo, {
      query: 'sculpture',
      limit: 1,
    });
    expect(res.results).toHaveLength(1);
    expect(res.license.name).toMatch(/CC BY-SA 3.0/);
    expect(res.attribution.license.name).toMatch(/CC BY-SA 3.0/);
  });

  it('rejects unsupported sites', async () => {
    const repo = new ScpRepository(
      {
        getIndex: async () => ({}),
        getContentIndexFor: async () => ({}),
        getContentFileFor: async () => ({}),
      },
      { collections: ['items'] },
    );

    await expect(
      scpSearchToolCall(repo, { site: 'ja', query: 'x' }),
    ).rejects.toThrow(/unsupported site/i);
  });
});
