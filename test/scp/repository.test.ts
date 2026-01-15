import { describe, expect, it } from 'vitest';

import { ScpRepository } from '../../src/scp/repository.js';

describe('ScpRepository', () => {
  it('builds a search index from content files and supports full-text search', async () => {
    const repo = new ScpRepository(
      {
        getIndex: async () => ({}),
        getContentIndexFor: async () => ({ 'series-1': 'content_series-1.json' }),
        getContentFileFor: async () => ({
          'SCP-173': {
            link: 'scp-173',
            title: 'SCP-173',
            url: 'https://scp-wiki.wikidot.com/scp-173',
            page_id: '1956234',
            rating: 100,
            tags: ['euclid'],
            series: 'series-1',
            created_at: '2008-07-25T20:49:00',
            creator: 'Test',
            raw_content:
              '<html><body><div id="page-content"><p>A statue that moves when not observed.</p></div></body></html>',
            raw_source: 'A statue that moves when not observed.',
          },
        }),
      },
      { collections: ['items'] },
    );

    const res = await repo.search({ query: 'statue', limit: 10 });
    expect(res.results[0]?.link).toBe('scp-173');
  });
});
