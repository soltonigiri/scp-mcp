type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type JsonCacheEntry = {
  etag?: string;
  lastModified?: string;
  value: unknown;
  bytes: number;
};

export type ScpDataApiClientOptions = {
  fetch?: FetchLike;
  maxCacheBytes?: number;
};

const SCP_DATA_API_ORIGIN = 'https://scp-data.tedivm.com';
const SCP_DATA_API_PATH_PREFIX = '/data/scp/';
const DEFAULT_MAX_CACHE_BYTES = 256 * 1024 * 1024;

export class ScpDataApiClient {
  private readonly fetchImpl: FetchLike;
  private readonly maxCacheBytes: number;
  private readonly cache = new Map<string, JsonCacheEntry>();
  private cacheBytes = 0;
  private readonly inFlight = new Map<string, Promise<unknown>>();

  constructor(options: ScpDataApiClientOptions = {}) {
    const fetchImpl = options.fetch ?? globalThis.fetch?.bind(globalThis);
    if (!fetchImpl) {
      throw new Error('fetch is not available in this environment');
    }

    this.fetchImpl = fetchImpl;
    this.maxCacheBytes = options.maxCacheBytes ?? DEFAULT_MAX_CACHE_BYTES;
  }

  async getJsonByUrl<T>(url: string | URL): Promise<T> {
    const parsed = typeof url === 'string' ? new URL(url) : url;
    this.assertAllowlisted(parsed);

    const key = parsed.toString();
    const existingInFlight = this.inFlight.get(key);
    if (existingInFlight) {
      return existingInFlight as Promise<T>;
    }

    const promise = this.fetchJsonWithCache<T>(key);
    this.inFlight.set(key, promise as Promise<unknown>);
    try {
      return await promise;
    } finally {
      this.inFlight.delete(key);
    }
  }

  async getItemsIndex(): Promise<Record<string, unknown>> {
    return this.getIndex('items');
  }

  async getContentIndex(): Promise<Record<string, string>> {
    return this.getContentIndexFor('items');
  }

  async getContentFile(fileName: string): Promise<Record<string, unknown>> {
    return this.getContentFileFor('items', fileName);
  }

  async getIndex(collection: string): Promise<Record<string, unknown>> {
    return this.getJsonByUrl(
      new URL(`${SCP_DATA_API_ORIGIN}${SCP_DATA_API_PATH_PREFIX}${collection}/index.json`),
    );
  }

  async getContentIndexFor(collection: string): Promise<Record<string, string>> {
    return this.getJsonByUrl(
      new URL(`${SCP_DATA_API_ORIGIN}${SCP_DATA_API_PATH_PREFIX}${collection}/content_index.json`),
    );
  }

  async getContentFileFor(collection: string, fileName: string): Promise<Record<string, unknown>> {
    if (!fileName.endsWith('.json')) {
      throw new Error('content file name must end with .json');
    }

    return this.getJsonByUrl(
      new URL(`${SCP_DATA_API_ORIGIN}${SCP_DATA_API_PATH_PREFIX}${collection}/${fileName}`),
    );
  }

  private assertAllowlisted(url: URL) {
    if (url.origin !== SCP_DATA_API_ORIGIN) {
      throw new Error(`URL not allowlisted: ${url.toString()}`);
    }

    if (!url.pathname.startsWith(SCP_DATA_API_PATH_PREFIX)) {
      throw new Error(`URL not allowlisted: ${url.toString()}`);
    }
  }

  private async fetchJsonWithCache<T>(url: string): Promise<T> {
    const cached = this.getCache(url);
    const headers: Record<string, string> = {};

    if (cached?.etag) {
      headers['If-None-Match'] = cached.etag;
    }
    if (cached?.lastModified) {
      headers['If-Modified-Since'] = cached.lastModified;
    }

    const res = await this.fetchImpl(url, Object.keys(headers).length > 0 ? { headers } : undefined);
    if (res.status === 304) {
      if (!cached) {
        throw new Error(`Got 304 but no cache entry exists for: ${url}`);
      }
      return cached.value as T;
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`SCP Data API request failed (${res.status}): ${body.slice(0, 200)}`);
    }

    const text = await res.text();
    const value = JSON.parse(text) as T;
    const bytes = Buffer.byteLength(text);
    const etag = res.headers.get('etag') ?? undefined;
    const lastModified = res.headers.get('last-modified') ?? undefined;

    this.setCache(url, { etag, lastModified, value, bytes });
    return value;
  }

  private getCache(key: string): JsonCacheEntry | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry;
  }

  private setCache(key: string, entry: JsonCacheEntry) {
    const existing = this.cache.get(key);
    if (existing) {
      this.cacheBytes -= existing.bytes;
      this.cache.delete(key);
    }

    this.cache.set(key, entry);
    this.cacheBytes += entry.bytes;

    while (this.cacheBytes > this.maxCacheBytes) {
      const oldestKey = this.cache.keys().next().value as string | undefined;
      if (!oldestKey) break;
      const oldest = this.cache.get(oldestKey);
      this.cache.delete(oldestKey);
      if (oldest) this.cacheBytes -= oldest.bytes;
    }
  }
}
