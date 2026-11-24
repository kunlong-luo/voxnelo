import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Resource = { from?: string; to?: string };
type ElectronBuild = { build?: { extraResources?: Resource[] } };

describe('Voxnelo first-party MIT license shipping contract', () => {
  it('declares a readable exact-copy resource for all desktop installer targets', () => {
    const metadata = JSON.parse(readFileSync('package.json', 'utf8')) as ElectronBuild;
    const resources = metadata.build?.extraResources;
    expect(Array.isArray(resources)).toBe(true);
    const licenseCopies = resources?.filter(item => item.from === 'LICENSE');
    expect(licenseCopies).toEqual([{ from: 'LICENSE', to: 'LICENSE' }]);
  });

  it('keeps the first-party copyright and MIT notice in the source document', () => {
    const license = readFileSync('LICENSE', 'utf8');
    expect(license).toMatch(/^MIT License\n/);
    expect(license).toContain('Copyright (c) 2026 Voxnelo contributors');
    expect(license).toContain(
      'The above copyright notice and this permission notice shall be included',
    );
  });
});
