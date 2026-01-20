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

    const res = engine.search({
      query: 'statue',
      limit: 10,
      sort: 'relevance',
    });
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

  it('returns default snippets for empty query', () => {
    const engine = new ScpSearchEngine();
    engine.add({
      id: 'SCP-001',
      link: 'scp-001',
      title: 'SCP-001',
      url: 'https://example.com/scp-001',
      page_id: '1001',
      rating: 1,
      tags: ['mystery'],
      series: 'series-1',
      created_at: '2020-01-01T00:00:00',
      creator: 'Test',
      text: 'A'.repeat(210),
    });

    const res = engine.search({ sort: 'relevance' });
    const snippet = res.results[0]?.snippet ?? '';
    expect(snippet).toHaveLength(201);
    expect(snippet.endsWith('…')).toBe(true);
  });

  it('returns contextual snippets when query matches', () => {
    const engine = new ScpSearchEngine();
    engine.add({
      id: 'SCP-002',
      link: 'scp-002',
      title: 'SCP-002',
      url: 'https://example.com/scp-002',
      page_id: '1002',
      rating: 2,
      tags: ['mystery'],
      series: 'series-1',
      created_at: '2020-01-02T00:00:00',
      creator: 'Test',
      text: `${'before '.repeat(20)}needle${' after'.repeat(30)}`,
    });

    const res = engine.search({ query: 'needle', sort: 'relevance' });
    const snippet = res.results[0]?.snippet ?? '';
    expect(snippet).toContain('needle');
    expect(snippet.startsWith('…')).toBe(true);
    expect(snippet.endsWith('…')).toBe(true);
  });

  it('returns fallback snippets when query missing', () => {
    const engine = new ScpSearchEngine();
    engine.add({
      id: 'SCP-003',
      link: 'scp-003',
      title: 'Absent Case',
      url: 'https://example.com/scp-003',
      page_id: '1003',
      rating: 2,
      tags: ['mystery'],
      series: 'series-1',
      created_at: '2020-01-03T00:00:00',
      creator: 'Test',
      text: 'word '.repeat(200),
    });
    engine.add({
      id: 'SCP-004',
      link: 'scp-004',
      title: 'Absent Case Two',
      url: 'https://example.com/scp-004',
      page_id: '1004',
      rating: 1,
      tags: ['mystery'],
      series: 'series-1',
      created_at: '2020-01-04T00:00:00',
      creator: 'Test',
      text: 'word '.repeat(200),
    });

    const res = engine.search({ query: 'absent', sort: 'rating' });
    const snippet = res.results[1]?.snippet ?? '';
    expect(snippet).not.toContain('absent');
    expect(snippet.startsWith('…')).toBe(true);
    expect(snippet.endsWith('…')).toBe(true);
  });
});
