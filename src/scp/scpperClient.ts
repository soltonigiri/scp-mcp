type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type ScpperClientOptions = {
  fetch?: FetchLike;
};

const SCPPER_PAGE_ENDPOINT = 'https://www.scpper.com/api/page';
const REQUEST_TIMEOUT_MS = 10_000;

export class ScpperClient {
  private readonly fetchImpl: FetchLike;

  constructor(options: ScpperClientOptions = {}) {
    const fetchImpl = options.fetch ?? globalThis.fetch?.bind(globalThis);
    if (!fetchImpl) {
      throw new Error('fetch is not available in this environment');
    }
    this.fetchImpl = fetchImpl;
  }

  async getAuthorsByPageId(pageId: string): Promise<string[]> {
    const url = new URL(SCPPER_PAGE_ENDPOINT);
    url.searchParams.set('id', pageId);

    const response = await this.fetchImpl(url, {
      redirect: 'error',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`SCPPER request failed (${response.status})`);
    }

    const body = (await response.json()) as { authors?: unknown };
    if (!Array.isArray(body.authors)) return [];

    const authors = body.authors.flatMap((entry) => {
      if (!entry || typeof entry !== 'object') return [];
      const user = (entry as Record<string, unknown>).user;
      if (typeof user !== 'string') return [];
      const name = user.trim();
      return name ? [name] : [];
    });
    return Array.from(new Set(authors));
  }
}
