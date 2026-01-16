export type LicenseInfo = {
  name: string;
  url: string;
};

export type AttributionInfo = {
  license: LicenseInfo;
  licensing_guide_url: string;
  notice: string;
};

export type PageAttributionInfo = AttributionInfo & {
  source_url: string;
  title: string;
  authors: string[];
};

export const SCP_CONTENT_LICENSE: LicenseInfo = {
  name: 'CC BY-SA 3.0',
  url: 'https://creativecommons.org/licenses/by-sa/3.0/',
};

export const SCP_LICENSING_GUIDE_URL =
  'https://scp-wiki.wikidot.com/licensing-guide';

export function buildDatasetAttribution(): AttributionInfo {
  return {
    license: SCP_CONTENT_LICENSE,
    licensing_guide_url: SCP_LICENSING_GUIDE_URL,
    notice:
      'SCP Wiki content is licensed under CC BY-SA 3.0. You must provide attribution and share-alike when reusing content.',
  };
}

export function buildPageAttribution(params: {
  url: string;
  title: string;
  authors: string[];
}): PageAttributionInfo {
  return {
    ...buildDatasetAttribution(),
    source_url: params.url,
    title: params.title,
    authors: params.authors,
  };
}

export function buildAttributionText(params: {
  url: string;
  title: string;
  authors: string[];
}): string {
  const authors =
    params.authors.length > 0 ? params.authors.join(', ') : '(unknown)';
  return [
    'Attribution (CC BY-SA 3.0):',
    `- Title: ${params.title}`,
    `- Authors: ${authors}`,
    `- Source: ${params.url}`,
    `- License: ${SCP_CONTENT_LICENSE.name} (${SCP_CONTENT_LICENSE.url})`,
    `- Licensing guide: ${SCP_LICENSING_GUIDE_URL}`,
    '',
    'If you modify the content, you must indicate changes and distribute your contributions under the same license.',
  ].join('\n');
}
