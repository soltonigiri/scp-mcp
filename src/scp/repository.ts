import { load } from 'cheerio';

import {
  formatScpContent,
  type ContentFormat,
  type ContentFormatOptions,
} from './contentFormatter.js';
import { buildAttributionText } from './licensing.js';
import {
  ScpSearchEngine,
  type ScpSearchDocument,
  type ScpSearchParams,
  type ScpSearchResponse,
} from './searchEngine.js';

export type ScpCollection = 'items' | 'tales' | 'hubs' | 'goi';

export type ScpDataSource = {
  getIndex: (collection: ScpCollection) => Promise<Record<string, unknown>>;
  getContentIndexFor: (
    collection: ScpCollection,
  ) => Promise<Record<string, string>>;
  getContentFileFor: (
    collection: ScpCollection,
    fileName: string,
  ) => Promise<Record<string, unknown>>;
};

export class ScpRepository {
  private readonly source: ScpDataSource;
  private readonly collections: ScpCollection[];
  private readonly searchEngine = new ScpSearchEngine();
  private searchIndexPromise: Promise<void> | undefined;
  private indexPromise: Promise<void> | undefined;
  private readonly pagesByRef = new Map<string, ScpPageMeta>();
  private readonly refsByLink = new Map<string, string[]>();
  private readonly refsByPageId = new Map<string, string[]>();
  private readonly itemRefsByScpNumber = new Map<number, string[]>();

  constructor(
    source: ScpDataSource,
    options: { collections?: ScpCollection[] } = {},
  ) {
    this.source = source;
    this.collections = options.collections ?? ['items', 'tales', 'hubs', 'goi'];
  }

  async search(params: ScpSearchParams): Promise<ScpSearchResponse> {
    await this.ensureSearchIndex();
    return this.searchEngine.search(params);
  }

  async getPage(params: {
    link?: string;
    page_id?: string | number;
    scp_number?: number;
  }): Promise<ScpPageMeta> {
    const ref = await this.resolveRef(params);
    const meta = this.pagesByRef.get(ref);
    if (!meta) throw new Error('Page not found');
    return meta;
  }

  async getContent(params: {
    link?: string;
    page_id?: string | number;
    format: ContentFormat;
    options?: ContentFormatOptions;
  }): Promise<{
    content: string;
    images: Array<{ url: string; alt?: string }>;
    source: { url: string; title: string; page_id: string };
    page: ScpPageMeta;
  }> {
    const ref = await this.resolveRef({
      link: params.link,
      page_id: params.page_id,
    });
    const meta = this.pagesByRef.get(ref);
    if (!meta) throw new Error('Page not found');

    const raw = await this.getRawContent(meta);
    const formatted = formatScpContent({
      raw_content: raw.raw_content,
      raw_source: raw.raw_source,
      images: raw.images,
      format: params.format,
      options: params.options,
    });

    return {
      content: formatted.content,
      images: formatted.images,
      source: { url: meta.url, title: meta.title, page_id: meta.page_id },
      page: meta,
    };
  }

  async getRelated(params: {
    link: string;
  }): Promise<
    Array<{ link: string; title: string; url: string; relation_type: string }>
  > {
    const meta = await this.getPage({ link: params.link });
    const related: Array<{
      link: string;
      title: string;
      url: string;
      relation_type: string;
    }> = [];
    const seen = new Set<string>();

    for (const link of meta.references ?? []) {
      const r = this.resolveLinkToMeta(link);
      if (!r) continue;
      if (seen.has(r.link)) continue;
      seen.add(r.link);
      related.push({
        link: r.link,
        title: r.title,
        url: r.url,
        relation_type: 'reference',
      });
    }

    for (const link of meta.hubs ?? []) {
      const r = this.resolveLinkToMeta(link);
      if (!r) continue;
      if (seen.has(r.link)) continue;
      seen.add(r.link);
      related.push({
        link: r.link,
        title: r.title,
        url: r.url,
        relation_type: 'hub',
      });
    }

    return related;
  }

  async getAttribution(params: { link: string }): Promise<{
    authors: string[];
    attribution_text: string;
    page: ScpPageMeta;
  }> {
    const meta = await this.getPage({ link: params.link });
    const authors = extractAuthors(meta.creator, meta.history);
    const attribution_text = buildAttributionText({
      url: meta.url,
      title: meta.title,
      authors,
    });
    return { authors, attribution_text, page: meta };
  }

  private async ensureSearchIndex(): Promise<void> {
    if (this.searchIndexPromise) return this.searchIndexPromise;

    this.searchIndexPromise = (async () => {
      for (const collection of this.collections) {
        if (collection === 'hubs') {
          const index = await this.source.getIndex('hubs');
          for (const [key, rawEntry] of Object.entries(index)) {
            const doc = buildSearchDocument({
              collection,
              key,
              entry: rawEntry as Record<string, unknown>,
              preferHtmlText: true,
            });
            if (!doc) continue;
            this.searchEngine.add(doc);
          }
          continue;
        }

        const contentIndex = await this.source.getContentIndexFor(collection);
        const files = Array.from(new Set(Object.values(contentIndex)));

        for (const fileName of files) {
          const content = await this.source.getContentFileFor(
            collection,
            fileName,
          );
          for (const [key, rawEntry] of Object.entries(content)) {
            const doc = buildSearchDocument({
              collection,
              key,
              entry: rawEntry as Record<string, unknown>,
              preferHtmlText: false,
            });
            if (!doc) continue;
            this.searchEngine.add(doc);
          }
        }
      }
    })();

    return this.searchIndexPromise;
  }

  private async ensureIndex(): Promise<void> {
    if (this.indexPromise) return this.indexPromise;

    this.indexPromise = (async () => {
      for (const collection of this.collections) {
        const index = await this.source.getIndex(collection);
        for (const [key, rawEntry] of Object.entries(index)) {
          const base = buildBaseFields(rawEntry as Record<string, unknown>);
          if (!base) continue;

          const meta: ScpPageMeta = {
            collection,
            key,
            link: base.link,
            title: base.title,
            url: base.url,
            page_id: base.pageId,
            rating: numberOrUndefined(base.entry.rating),
            tags: arrayOfStrings(base.entry.tags),
            series: stringOrUndefined(base.entry.series),
            created_at: stringOrUndefined(base.entry.created_at),
            creator: stringOrUndefined(base.entry.creator),
            history: Array.isArray(base.entry.history)
              ? (base.entry.history as unknown[])
              : undefined,
            references: arrayOfStrings(base.entry.references),
            hubs: arrayOfStrings(base.entry.hubs),
            images: arrayOfStrings(base.entry.images),
            content_file: stringOrUndefined(base.entry.content_file),
            raw_content: stringOrUndefined(base.entry.raw_content),
            raw_source: stringOrUndefined(base.entry.raw_source),
            scp_number: numberOrUndefined(base.entry.scp_number),
          };

          this.registerPageRef(meta);
        }
      }
    })();

    return this.indexPromise;
  }

  private async resolveRef(params: {
    link?: string;
    page_id?: string | number;
    scp_number?: number;
  }): Promise<string> {
    await this.ensureIndex();

    if (params.link) {
      return resolveSingleRef({
        label: 'link',
        value: params.link,
        refs: this.refsByLink.get(normalizeLinkKey(params.link)),
      });
    }

    if (params.page_id !== undefined) {
      const pageId = String(params.page_id);
      return resolveSingleRef({
        label: 'page_id',
        value: pageId,
        refs: this.refsByPageId.get(pageId),
      });
    }

    if (params.scp_number !== undefined) {
      const canonicalKey = canonicalScpKey(params.scp_number);
      const canonicalRef = makeRef('items', canonicalKey);
      if (this.pagesByRef.has(canonicalRef)) return canonicalRef;

      const refs = this.itemRefsByScpNumber.get(params.scp_number) ?? [];
      if (refs.length === 0)
        throw new Error(`Page not found for scp_number: ${params.scp_number}`);
      return refs.slice().sort()[0] as string;
    }

    throw new Error('One of link, page_id, or scp_number is required');
  }

  private resolveLinkToMeta(link: string): ScpPageMeta | undefined {
    const refs = this.refsByLink.get(normalizeLinkKey(link));
    if (!refs || refs.length !== 1) return undefined;
    return this.pagesByRef.get(refs[0] as string);
  }

  private registerPageRef(meta: ScpPageMeta) {
    const ref = makeRef(meta.collection, meta.key);
    this.pagesByRef.set(ref, meta);

    const linkKey = normalizeLinkKey(meta.link);
    pushToMapArray(this.refsByLink, linkKey, ref);
    pushToMapArray(this.refsByPageId, meta.page_id, ref);

    if (meta.collection === 'items' && meta.scp_number !== undefined) {
      pushToMapArray(this.itemRefsByScpNumber, meta.scp_number, ref);
    }
  }

  private async getRawContent(meta: ScpPageMeta): Promise<{
    raw_content?: string;
    raw_source?: string;
    images?: string[];
  }> {
    if (meta.collection === 'hubs') {
      return {
        raw_content: meta.raw_content,
        raw_source: meta.raw_source,
        images: meta.images,
      };
    }

    if (!meta.content_file) {
      throw new Error('content_file is missing for this page');
    }

    const file = await this.source.getContentFileFor(
      meta.collection,
      meta.content_file,
    );
    const entry = file[meta.key] as Record<string, unknown> | undefined;
    if (!entry) {
      throw new Error('Content not found');
    }

    const raw_content = stringOrUndefined(entry.raw_content);
    const raw_source = stringOrUndefined(entry.raw_source);
    const images = arrayOfStrings(entry.images);
    return {
      raw_content,
      raw_source,
      images: images.length > 0 ? images : meta.images,
    };
  }
}

export type ScpPageMeta = {
  collection: ScpCollection;
  key: string;
  link: string;
  title: string;
  url: string;
  page_id: string;
  rating?: number;
  tags: string[];
  series?: string;
  created_at?: string;
  creator?: string;
  history?: unknown[];
  references?: string[];
  hubs?: string[];
  images?: string[];
  content_file?: string;
  raw_content?: string;
  raw_source?: string;
  scp_number?: number;
};

function extractTextFromRawContent(rawContent: string): string {
  const $ = load(rawContent);
  const el = $('#page-content');
  return (el.length > 0 ? el.text() : $.text()).trim();
}

type BaseFields = {
  link: string;
  title: string;
  url: string;
  pageId: string;
  entry: Record<string, unknown>;
};

type BuildSearchDocParams = {
  collection: ScpCollection;
  key: string;
  entry: Record<string, unknown>;
  preferHtmlText: boolean;
};

function buildBaseFields(
  entry: Record<string, unknown>,
): BaseFields | undefined {
  const link = stringOrEmpty(entry.link);
  const title = stringOrEmpty(entry.title);
  const url = stringOrEmpty(entry.url);
  const pageId = String(entry.page_id ?? '');
  if (!link || !title || !url || !pageId) return undefined;
  return { link, title, url, pageId, entry };
}

function buildSearchDocument(
  params: BuildSearchDocParams,
): ScpSearchDocument | undefined {
  const base = buildBaseFields(params.entry);
  if (!base) return undefined;

  const rawContent = stringOrUndefined(base.entry.raw_content);
  const rawSource = stringOrUndefined(base.entry.raw_source);
  const text = params.preferHtmlText
    ? rawContent
      ? extractTextFromRawContent(rawContent)
      : ''
    : rawContent
      ? extractTextFromRawContent(rawContent)
      : (rawSource ?? '');

  return {
    id: `${params.collection}:${params.key}`,
    link: base.link,
    title: base.title,
    url: base.url,
    page_id: base.pageId,
    rating: numberOrUndefined(base.entry.rating) ?? 0,
    tags: arrayOfStrings(base.entry.tags),
    series: stringOrUndefined(base.entry.series),
    created_at: stringOrEmpty(base.entry.created_at),
    creator: stringOrUndefined(base.entry.creator),
    text,
  };
}

function resolveSingleRef(params: {
  label: 'link' | 'page_id';
  value: string;
  refs: string[] | undefined;
}): string {
  const refs = params.refs ?? [];
  if (refs.length === 0)
    throw new Error(`Page not found for ${params.label}: ${params.value}`);
  if (refs.length > 1)
    throw new Error(`Ambiguous ${params.label}: ${params.value}`);
  return refs[0] as string;
}

function stringOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function arrayOfStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

function normalizeLinkKey(link: string): string {
  return link.trim().replace(/^\//, '').toLowerCase();
}

function makeRef(collection: ScpCollection, key: string): string {
  return `${collection}:${key}`;
}

function canonicalScpKey(scpNumber: number): string {
  if (!Number.isFinite(scpNumber)) return '';
  const n = Math.trunc(scpNumber);
  const digits = String(n);
  const padded = digits.length >= 3 ? digits : digits.padStart(3, '0');
  return `SCP-${padded}`;
}

function pushToMapArray<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const existing = map.get(key);
  if (!existing) {
    map.set(key, [value]);
    return;
  }
  existing.push(value);
}

function extractAuthors(
  creator: string | undefined,
  history: unknown[] | undefined,
): string[] {
  const authors: string[] = [];
  if (creator) authors.push(creator);
  if (history) {
    for (const e of history) {
      if (!e || typeof e !== 'object') continue;
      const author = (e as Record<string, unknown>).author;
      if (typeof author === 'string') authors.push(author);
    }
  }
  return Array.from(
    new Set(authors.map((a) => a.trim()).filter((a) => a.length > 0)),
  );
}
