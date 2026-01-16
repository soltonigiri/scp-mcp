import type { ScpRepository } from '../scp/repository.js';
import type { ScpSearchSort } from '../scp/searchEngine.js';
import {
  buildDatasetAttribution,
  SCP_CONTENT_LICENSE,
} from '../scp/licensing.js';

export type ScpSearchToolInput = {
  query?: string;
  site?: string;
  tags?: string[];
  series?: string;
  created_at_from?: string;
  created_at_to?: string;
  rating_min?: number;
  rating_max?: number;
  limit?: number;
  sort?: ScpSearchSort;
};

export async function scpSearchToolCall(
  repo: ScpRepository,
  input: ScpSearchToolInput,
) {
  const site = input.site ?? 'en';
  if (site !== 'en') {
    throw new Error(`Unsupported site: ${site}`);
  }

  const res = await repo.search({
    query: input.query,
    tags: input.tags,
    series: input.series,
    created_at_from: input.created_at_from,
    created_at_to: input.created_at_to,
    rating_min: input.rating_min,
    rating_max: input.rating_max,
    limit: input.limit,
    sort: input.sort,
  });

  return {
    results: res.results.map((r) => ({
      link: r.link,
      title: r.title,
      url: r.url,
      page_id: r.page_id,
      rating: r.rating,
      tags: r.tags,
      series: r.series,
      created_at: r.created_at,
      creator: r.creator,
      snippet: r.snippet,
    })),
    content_is_untrusted: true,
    license: SCP_CONTENT_LICENSE,
    attribution: buildDatasetAttribution(),
  };
}
