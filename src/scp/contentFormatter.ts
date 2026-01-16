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
    if (!params.raw_source) {
      throw new Error('wikitext is not available for this page');
    }
    return {
      content: params.raw_source.trim(),
      images: normalizeImages(params.images),
    };
  }

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

  if (params.format === 'html') {
    const html = root.html() ?? '';
    return {
      content: html.trim(),
      images:
        extractedImages.length > 0
          ? extractedImages
          : normalizeImages(params.images),
    };
  }

  if (params.format === 'text') {
    const text = root.text().replace(/\s+/g, ' ').trim();
    return {
      content: text,
      images:
        extractedImages.length > 0
          ? extractedImages
          : normalizeImages(params.images),
    };
  }

  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  });
  turndown.remove('img');

  const html = root.html() ?? '';
  const md = turndown.turndown(html).trim();
  return {
    content: md,
    images:
      extractedImages.length > 0
        ? extractedImages
        : normalizeImages(params.images),
  };
}

function normalizeImages(images: string[] | undefined): Array<{ url: string }> {
  if (!images) return [];
  return images
    .filter((u) => typeof u === 'string' && u.length > 0)
    .map((url) => ({ url }));
}
