import { describe, expect, it } from 'vitest';

import { ScpRepository } from '../../src/scp/repository.js';

describe('ScpRepository', () => {
  it('builds a search index from metadata without loading content files', async () => {
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

    const res = await repo.search({ query: 'sculpture', limit: 10 });
    expect(res.results[0]?.link).toBe('scp-173');
  });

  it('uses created_by as the author without including revision editors', async () => {
    const repo = new ScpRepository(
      {
        getIndex: async () => ({
          tale: {
            link: 'a-tale',
            title: 'A Tale',
            url: 'https://scp-wiki.wikidot.com/a-tale',
            page_id: '2001',
            created_by: 'Original Author',
            history: [{ author: 'Revision Editor' }],
          },
        }),
        getContentIndexFor: async () => ({}),
        getContentFileFor: async () => ({}),
      },
      { collections: ['tales'] },
    );

    const attribution = await repo.getAttribution({ link: 'a-tale' });
    expect(attribution.authors).toEqual(['Original Author']);
  });

  it('keeps attribution available when the configured author source fails', async () => {
    const repo = new ScpRepository(
      {
        getIndex: async () => ({
          page: {
            link: 'a-page',
            title: 'A Page',
            url: 'https://scp-wiki.wikidot.com/a-page',
            page_id: '3001',
            creator: 'Import Account',
          },
        }),
        getContentIndexFor: async () => ({}),
        getContentFileFor: async () => ({}),
      },
      {
        collections: ['tales'],
        authorSource: {
          getAuthorsByPageId: async () => {
            throw new Error('unavailable');
          },
        },
      },
    );

    const attribution = await repo.getAttribution({ link: 'a-page' });
    expect(attribution.authors).toEqual([]);
    expect(attribution.attribution_text).toContain('Authors: (unknown)');
  });
});
