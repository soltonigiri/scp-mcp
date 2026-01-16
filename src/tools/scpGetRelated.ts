import type { ScpRepository } from '../scp/repository.js';
import { buildPageAttribution, SCP_CONTENT_LICENSE } from '../scp/licensing.js';

export type ScpGetRelatedToolInput = {
  link: string;
};

export async function scpGetRelatedToolCall(
  repo: ScpRepository,
  input: ScpGetRelatedToolInput,
) {
  const related = await repo.getRelated({ link: input.link });
  const a = await repo.getAttribution({ link: input.link });
  const page = a.page;

  return {
    related,
    license: SCP_CONTENT_LICENSE,
    attribution: buildPageAttribution({
      url: page.url,
      title: page.title,
      authors: a.authors,
    }),
  };
}
