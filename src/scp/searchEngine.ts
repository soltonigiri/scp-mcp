import MiniSearch from 'minisearch';

export type ScpSearchSort = 'relevance' | 'rating' | 'created_at';

export type ScpSearchDocument = {
  id: string;
  link: string;
  title: string;
  url: string;
  page_id: string;
  rating: number;
  tags: string[];
  series?: string;
  created_at: string;
  creator?: string;
  text: string;
};

export type ScpSearchParams = {
  query?: string;
  tags?: string[];
  series?: string;
  created_at_from?: string;
  created_at_to?: string;
  rating_min?: number;
  rating_max?: number;
  limit?: number;
  sort?: ScpSearchSort;
};

export type ScpSearchResult = Omit<ScpSearchDocument, 'id' | 'text'> & {
  snippet: string;
};

export type ScpSearchResponse = {
  results: ScpSearchResult[];
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export class ScpSearchEngine {
  private readonly miniSearch = new MiniSearch<ScpSearchDocument>({
    idField: 'id',
    fields: ['title', 'text'],
    storeFields: [
      'id',
      'link',
      'title',
      'url',
      'page_id',
      'rating',
      'tags',
      'series',
      'created_at',
      'creator',
    ],
    searchOptions: {
      boost: { title: 2 },
    },
  });

  private readonly docs = new Map<string, ScpSearchDocument>();

  add(doc: ScpSearchDocument) {
    this.docs.set(doc.id, doc);
    this.miniSearch.add(doc);
  }

  search(params: ScpSearchParams): ScpSearchResponse {
    const sort: ScpSearchSort = params.sort ?? 'relevance';
    const limit = clampLimit(params.limit);
    const query = params.query?.trim() ?? '';

    const filters = {
      tags: normalizeTags(params.tags),
      series: params.series?.trim(),
      createdAtFrom: parseDateOrUndefined(params.created_at_from),
      createdAtTo: parseDateOrUndefined(params.created_at_to),
      ratingMin: params.rating_min,
      ratingMax: params.rating_max,
    };

    const results: Array<{ doc: ScpSearchDocument; score?: number }> =
      query.length > 0
        ? this.miniSearch.search(query).map((r) => ({
            doc: this.docs.get(r.id) as ScpSearchDocument,
            score: r.score,
          }))
        : Array.from(this.docs.values()).map((doc) => ({ doc }));

    const filtered = results
      .filter(({ doc }) => Boolean(doc))
      .filter(({ doc }) => matchesFilters(doc, filters));

    const sorted = filtered.sort((a, b) => compareSearch(sort, a, b));
    const sliced = sorted.slice(0, limit);

    return {
      results: sliced.map(({ doc }, idx) => ({
        link: doc.link,
        title: doc.title,
        url: doc.url,
        page_id: doc.page_id,
        rating: doc.rating,
        tags: doc.tags,
        series: doc.series,
        created_at: doc.created_at,
        creator: doc.creator,
        snippet: makeSnippet(doc.text, query, idx),
      })),
    };
  }
}

function clampLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_LIMIT;
  if (!Number.isFinite(limit)) return DEFAULT_LIMIT;
  if (limit < 1) return 1;
  return Math.min(limit, MAX_LIMIT);
}

function normalizeTags(tags: string[] | undefined): string[] {
  if (!tags) return [];
  return tags
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);
}

function matchesFilters(
  doc: ScpSearchDocument,
  filters: {
    tags: string[];
    series?: string;
    createdAtFrom?: Date;
    createdAtTo?: Date;
    ratingMin?: number;
    ratingMax?: number;
  },
): boolean {
  if (filters.series && doc.series !== filters.series) return false;

  if (filters.tags.length > 0) {
    const docTags = new Set(doc.tags.map((t) => t.toLowerCase()));
    for (const t of filters.tags) {
      if (!docTags.has(t)) return false;
    }
  }

  if (filters.ratingMin !== undefined && doc.rating < filters.ratingMin) return false;
  if (filters.ratingMax !== undefined && doc.rating > filters.ratingMax) return false;

  const createdAt = parseDateOrUndefined(doc.created_at);
  if (filters.createdAtFrom && createdAt && createdAt < filters.createdAtFrom) return false;
  if (filters.createdAtTo && createdAt && createdAt > filters.createdAtTo) return false;

  return true;
}

function compareSearch(
  sort: ScpSearchSort,
  a: { doc: ScpSearchDocument; score?: number },
  b: { doc: ScpSearchDocument; score?: number },
): number {
  if (sort === 'created_at') {
    return b.doc.created_at.localeCompare(a.doc.created_at);
  }
  if (sort === 'rating') {
    return b.doc.rating - a.doc.rating;
  }

  const aScore = a.score ?? 0;
  const bScore = b.score ?? 0;
  if (bScore !== aScore) return bScore - aScore;
  return b.doc.rating - a.doc.rating;
}

function makeSnippet(text: string, query: string, fallbackIdx: number): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length === 0) return '';

  const maxLen = 200;
  if (!query) {
    const s = normalized.slice(0, maxLen);
    return normalized.length > s.length ? `${s}…` : s;
  }

  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const lower = normalized.toLowerCase();
  let firstIdx = -1;
  for (const term of terms) {
    const idx = lower.indexOf(term);
    if (idx !== -1 && (firstIdx === -1 || idx < firstIdx)) {
      firstIdx = idx;
    }
  }

  if (firstIdx === -1) {
    const start = Math.min(fallbackIdx * 40, Math.max(0, normalized.length - maxLen));
    const s = normalized.slice(start, start + maxLen);
    const prefix = start > 0 ? '…' : '';
    const suffix = start + maxLen < normalized.length ? '…' : '';
    return `${prefix}${s}${suffix}`;
  }

  const contextBefore = 80;
  const contextAfter = 120;
  const start = Math.max(0, firstIdx - contextBefore);
  const end = Math.min(normalized.length, firstIdx + contextAfter);
  const s = normalized.slice(start, end);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < normalized.length ? '…' : '';
  return `${prefix}${s}${suffix}`;
}

function parseDateOrUndefined(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}
