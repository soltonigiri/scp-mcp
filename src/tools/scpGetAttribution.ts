import type { ScpRepository } from '../scp/repository.js';
import { buildPageAttribution, SCP_CONTENT_LICENSE } from '../scp/licensing.js';

export type ScpGetAttributionToolInput = {
  link: string;
};

export async function scpGetAttributionToolCall(
  repo: ScpRepository,
  input: ScpGetAttributionToolInput,
) {
  const res = await repo.getAttribution({ link: input.link });
  return {
    attribution_text: res.attribution_text,
    authors: res.authors,
    license: SCP_CONTENT_LICENSE,
    attribution: buildPageAttribution({
      url: res.page.url,
      title: res.page.title,
      authors: res.authors,
    }),
  };
}
