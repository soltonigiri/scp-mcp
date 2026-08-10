import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { VERSION } from '../src/index.js';

const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { version: string };

describe('smoke', () => {
  it('exports version', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('keeps the exported version in sync with package.json', () => {
    expect(VERSION).toBe(packageJson.version);
  });
});
