import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { VERSION } from '../src/index.js';

const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as {
  version: string;
  bin?: Record<string, string>;
  repository?: { url?: string };
  homepage?: string;
  bugs?: { url?: string };
  keywords?: string[];
  mcpName?: string;
};

const serverJson = JSON.parse(
  readFileSync(new URL('../server.json', import.meta.url), 'utf8'),
) as {
  name: string;
  version: string;
  packages: Array<{ identifier: string; version: string }>;
};

describe('smoke', () => {
  it('exports version', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('keeps the exported version in sync with package.json', () => {
    expect(VERSION).toBe(packageJson.version);
  });

  it('publishes an executable package with MCP Registry metadata', () => {
    expect(packageJson.bin).toEqual({ 'scp-mcp': 'dist/cli/stdio.js' });
    expect(packageJson.repository?.url).toContain('soltonigiri/scp-mcp');
    expect(packageJson.homepage).toContain('soltonigiri/scp-mcp');
    expect(packageJson.bugs?.url).toContain('soltonigiri/scp-mcp');
    expect(packageJson.keywords).toEqual(
      expect.arrayContaining(['mcp', 'scp', 'model-context-protocol']),
    );
    expect(packageJson.mcpName).toBe('io.github.soltonigiri/scp-mcp');
    expect(serverJson).toMatchObject({
      name: packageJson.mcpName,
      version: packageJson.version,
      packages: [
        {
          identifier: 'scp-mcp',
          version: packageJson.version,
        },
      ],
    });
  });

  it('keeps the stdio executable directly runnable by Node.js', () => {
    const source = readFileSync(
      new URL('../src/cli/stdio.ts', import.meta.url),
      'utf8',
    );
    expect(source.startsWith('#!/usr/bin/env node\n')).toBe(true);
  });
});
