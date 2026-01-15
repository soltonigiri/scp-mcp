import { describe, expect, it } from 'vitest';

import { ScpSearchEngine } from '../../src/scp/searchEngine.js';

describe('ScpSearchEngine', () => {
  it('searches title+content with BM25-like relevance scoring', () => {
    const engine = new ScpSearchEngine();
    engine.add({
      id: 'SCP-173',
      link: 'scp-173',
      title: 'SCP-173',
      url: 'https://scp-wiki.wikidot.com/scp-173',
      page_id: '1956234',
      rating: 100,
      tags: ['euclid', 'hostile'],
      series: 'series-1',
      created_at: '2008-07-25T20:49:00',
      creator: 'Test Author',
      text: 'A statue that moves when not observed.',
    });
    engine.add({
      id: 'SCP-002',
      link: 'scp-002',
      title: 'SCP-002',
      url: 'https://scp-wiki.wikidot.com/scp-002',
      page_id: '1956002',
      rating: 50,
      tags: ['euclid'],
      series: 'series-1',
      created_at: '2008-07-19T22:37:00',
      creator: 'Test Author',
      text: 'A strange living room organism.',
    });

    const res = engine.search({ query: 'statue', limit: 10, sort: 'relevance' });
    expect(res.results[0]?.link).toBe('scp-173');
  });

  it('filters by tags and series and respects limit', () => {
    const engine = new ScpSearchEngine();
    for (let i = 0; i < 5; i += 1) {
      engine.add({
        id: `SCP-${i}`,
        link: `scp-${i}`,
        title: `SCP-${i}`,
        url: `https://example.com/scp-${i}`,
        page_id: `${1000 + i}`,
        rating: i,
        tags: i % 2 === 0 ? ['even', 'foo'] : ['odd'],
        series: i % 2 === 0 ? 'series-1' : 'series-2',
        created_at: `2020-01-0${i + 1}T00:00:00`,
        creator: 'Test',
        text: 'foo bar baz',
      });
    }

    const res = engine.search({
      query: 'foo',
      tags: ['even'],
      series: 'series-1',
      limit: 2,
      sort: 'rating',
    });
    expect(res.results).toHaveLength(2);
    expect(res.results.every((r) => r.tags.includes('even'))).toBe(true);
    expect(res.results.every((r) => r.series === 'series-1')).toBe(true);
  });
});

