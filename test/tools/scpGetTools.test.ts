import { describe, expect, it } from 'vitest';

import { ScpRepository } from '../../src/scp/repository.js';
import { scpGetAttributionToolCall } from '../../src/tools/scpGetAttribution.js';
import { scpGetContentToolCall } from '../../src/tools/scpGetContent.js';
import { scpGetPageToolCall } from '../../src/tools/scpGetPage.js';
import { scpGetRelatedToolCall } from '../../src/tools/scpGetRelated.js';

function createItemsRepo() {
  const index = {
    'SCP-172': {
      content_file: 'content_series-1.json',
      link: 'scp-172',
      title: 'SCP-172',
      url: 'https://scp-wiki.wikidot.com/scp-172',
      page_id: 1956172,
      rating: 1,
      tags: ['euclid'],
      created_at: '2008-07-25T00:00:00',
      creator: 'Author A',
      references: [],
      hubs: [],
      images: [],
      history: [{ author: 'Author A' }],
      series: 'series-1',
      scp_number: 172,
    },
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
      references: ['scp-172'],
      hubs: [],
      images: [],
      history: [{ author: 'Author B' }],
      series: 'series-1',
      scp_number: 173,
    },
  } as const;

  const contentSeries1 = {
    'SCP-172': {
      link: 'scp-172',
      title: 'SCP-172',
      url: 'https://scp-wiki.wikidot.com/scp-172',
      page_id: '1956172',
      rating: 1,
      tags: ['euclid'],
      series: 'series-1',
      created_at: '2008-07-25T00:00:00',
      creator: 'Author A',
      raw_content:
        '<html><body><div id="page-content"><p>Test content 172.</p></div></body></html>',
      raw_source: 'Test content 172.',
      images: [],
      references: [],
      hubs: [],
      history: [{ author: 'Author A' }],
      scp_number: 172,
    },
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
      references: ['scp-172'],
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

describe('SCP get tools', () => {
  it('scp_get_page resolves by link', async () => {
    const repo = createItemsRepo();
    const res = await scpGetPageToolCall(repo, { link: 'scp-173' });
    expect(res.page.link).toBe('scp-173');
    expect(res.license.name).toMatch(/CC BY-SA 3.0/);
  });

  it('scp_get_content returns requested formats', async () => {
    const repo = createItemsRepo();

    const text = await scpGetContentToolCall(repo, {
      link: 'scp-173',
      format: 'text',
    });
    expect(text.content).toMatch(/statue/i);
    expect(text.content_is_untrusted).toBe(true);

    const wt = await scpGetContentToolCall(repo, {
      link: 'scp-173',
      format: 'wikitext',
    });
    expect(wt.content).toMatch(/statue/i);

    const md = await scpGetContentToolCall(repo, {
      link: 'scp-173',
      format: 'markdown',
    });
    expect(md.content).toMatch(/statue/i);
  });

  it('scp_get_related returns references as related pages', async () => {
    const repo = createItemsRepo();
    const res = await scpGetRelatedToolCall(repo, { link: 'scp-173' });
    expect(res.related).toHaveLength(1);
    expect(res.related[0]?.link).toBe('scp-172');
    expect(res.related[0]?.relation_type).toBe('reference');
  });

  it('scp_get_attribution generates an attribution template', async () => {
    const repo = createItemsRepo();
    const res = await scpGetAttributionToolCall(repo, { link: 'scp-173' });
    expect(res.authors).toContain('Author B');
    expect(res.attribution_text).toMatch(/SCP-173/);
    expect(res.attribution_text).toMatch(/CC BY-SA 3.0/);
  });
});
