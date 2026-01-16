import type { ScpRepository } from '../scp/repository.js';
import { buildPageAttribution, SCP_CONTENT_LICENSE } from '../scp/licensing.js';

export type ScpGetPageToolInput = {
  link?: string;
  scp_number?: number;
  page_id?: string | number;
};

export async function scpGetPageToolCall(
  repo: ScpRepository,
  input: ScpGetPageToolInput,
) {
  const page = await repo.getPage({
    link: input.link,
    scp_number: input.scp_number,
    page_id: input.page_id,
  });
  const a = await repo.getAttribution({ link: page.link });

  return {
    page,
    license: SCP_CONTENT_LICENSE,
    attribution: buildPageAttribution({
      url: page.url,
      title: page.title,
      authors: a.authors,
    }),
  };
}
