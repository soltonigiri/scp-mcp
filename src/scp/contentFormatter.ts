import { load } from 'cheerio';
import TurndownService from 'turndown';

export type ContentFormat = 'markdown' | 'text' | 'html' | 'wikitext';

export type ContentFormatOptions = {
  include_tables?: boolean;
  include_footnotes?: boolean;
};

export type FormattedContent = {
  content: string;
  images: Array<{ url: string; alt?: string }>;
};

export function formatScpContent(params: {
  raw_content?: string;
  raw_source?: string;
  images?: string[];
  format: ContentFormat;
  options?: ContentFormatOptions;
}): FormattedContent {
  if (params.format === 'wikitext') {
    return formatWikitext(params.raw_source, params.images);
  }

  const { root, extractedImages } = prepareHtmlContent(params);
  const images = selectImages(extractedImages, params.images);

  if (params.format === 'html') {
    return {
      content: (root.html() ?? '').trim(),
      images,
    };
  }

  if (params.format === 'text') {
    return {
      content: root.text().replace(/\s+/g, ' ').trim(),
      images,
    };
  }

  return {
    content: formatMarkdown(root.html() ?? ''),
    images,
  };
}

function formatWikitext(
  rawSource: string | undefined,
  images: string[] | undefined,
): FormattedContent {
  if (!rawSource) {
    throw new Error('wikitext is not available for this page');
  }
  return {
    content: rawSource.trim(),
    images: normalizeImages(images),
  };
}

function prepareHtmlContent(params: {
  raw_content?: string;
  options?: ContentFormatOptions;
}): {
  root: ReturnType<typeof load> extends (html: string) => infer R ? R : never;
  extractedImages: Array<{ url: string; alt?: string }>;
} {
  if (!params.raw_content) {
    throw new Error('html content is not available for this page');
  }

  const includeTables = params.options?.include_tables ?? true;
  const includeFootnotes = params.options?.include_footnotes ?? true;

  const $ = load(params.raw_content);
  const root = $('#page-content').length > 0 ? $('#page-content') : $('body');

  root.find('script, style').remove();
  if (!includeTables) root.find('table').remove();
  if (!includeFootnotes)
    root.find('.footnote, .footnoteref, .footnotes').remove();

  const extractedImages: Array<{ url: string; alt?: string }> = [];
  root.find('img').each((_, el) => {
    const src = $(el).attr('src');
    const alt = $(el).attr('alt') ?? undefined;
    if (src) extractedImages.push({ url: src, alt });
    $(el).remove();
  });

  return { root, extractedImages };
}

function selectImages(
  extractedImages: Array<{ url: string; alt?: string }>,
  images: string[] | undefined,
): Array<{ url: string; alt?: string }> {
  return extractedImages.length > 0 ? extractedImages : normalizeImages(images);
}

function formatMarkdown(html: string): string {
  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  });
  turndown.remove('img');

  return turndown.turndown(html).trim();
}

function normalizeImages(images: string[] | undefined): Array<{ url: string }> {
  if (!images) return [];
  return images
    .filter((u) => typeof u === 'string' && u.length > 0)
    .map((url) => ({ url }));
}
