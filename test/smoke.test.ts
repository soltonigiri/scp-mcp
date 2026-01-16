import { describe, expect, it } from 'vitest';

import { VERSION } from '../src/index.js';

describe('smoke', () => {
  it('exports version', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
