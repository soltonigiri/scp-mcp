import { describe, expect, it } from 'vitest';

import { ScpRepository } from '../../src/scp/repository.js';

describe('ScpRepository', () => {
  it('builds a search index from content files and supports full-text search', async () => {
    const repo = new ScpRepository(
      {
        getIndex: async () => ({}),
        getContentIndexFor: async () => ({
          'series-1': 'content_series-1.json',
        }),
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

  it('indexes pages with the same content key when page ids differ', async () => {
    const files: Record<string, Record<string, unknown>> = {
      'content_joke.json': {
        'SCP-001': {
          link: 'scp-001-j',
          title: 'SCP-001-J',
          url: 'https://scp-wiki.wikidot.com/scp-001-j',
          page_id: '1001',
          raw_source: 'First proposal',
        },
      },
      'content_scp-001.json': {
        'SCP-001': {
          link: 'scp-001-gate-guardian',
          title: 'SCP-001 Gate Guardian',
          url: 'https://scp-wiki.wikidot.com/dr-clef-s-proposal',
          page_id: '1002',
          raw_source: 'Second proposal',
        },
      },
    };
    const repo = new ScpRepository(
      {
        getIndex: async () => ({}),
        getContentIndexFor: async () => ({
          joke: 'content_joke.json',
          proposals: 'content_scp-001.json',
        }),
        getContentFileFor: async (_collection, fileName) =>
          files[fileName] ?? {},
      },
      { collections: ['items'] },
    );

    const res = await repo.search({ query: 'proposal', limit: 10 });
    expect(res.results.map((result) => result.link).sort()).toEqual([
      'scp-001-gate-guardian',
      'scp-001-j',
    ]);
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
