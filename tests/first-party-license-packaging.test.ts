import { assertSupplementalNoticeBytes, selectInstalledSupplementalNotice } from '../scripts/check-installed-linux-license.mts';
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

describe('supplemental native notice shipping contract', () => {
  it('ships the complete supplemental directory for every desktop target', () => {
    const metadata = JSON.parse(readFileSync('package.json', 'utf8')) as ElectronBuild;
    expect(metadata.build?.extraResources?.filter(item => item.from === 'build/third-party-notices'))
      .toEqual([{ from: 'build/third-party-notices', to: 'THIRD-PARTY-NOTICES' }]);
  });

  it('rejects missing, duplicate or altered installed supplemental notices', () => {
    const root = '/opt/Voxnelo/resources/LICENSE';
    const notice = '/opt/Voxnelo/resources/THIRD-PARTY-NOTICES/Mantle.txt';
    expect(selectInstalledSupplementalNotice([root, notice], root, 'Mantle.txt')).toBe(notice);
    expect(() => selectInstalledSupplementalNotice([root], root, 'Mantle.txt')).toThrow();
    expect(() => selectInstalledSupplementalNotice([root, notice, notice], root, 'Mantle.txt')).toThrow();
    expect(() => selectInstalledSupplementalNotice([root, '/other/THIRD-PARTY-NOTICES/Mantle.txt'], root, 'Mantle.txt')).toThrow();
    const bytes = readFileSync('build/third-party-notices/Mantle.txt');
    expect(() => assertSupplementalNoticeBytes(bytes, bytes)).not.toThrow();
    const altered = Buffer.from(bytes);
    altered[0] = altered[0]! ^ 1;
    expect(() => assertSupplementalNoticeBytes(bytes, altered)).toThrow();
  });
});
