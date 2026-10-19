import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { checkPackagingPlatform } from '../scripts/check-packaging-platform.mts';

describe('desktop installer platform preflight', () => {
  it('fails early for macOS DMG on Linux instead of waiting for missing sips', () => {
    const check = checkPackagingPlatform('mac','linux');
    expect(check.ok).toBe(false);
    expect(check.message).toContain('sips');
    expect(check.message).toContain('macos-latest');
  });

  it('permits macOS DMG only on the native macOS runner', () => {
    expect(checkPackagingPlatform('mac','darwin').ok).toBe(true);
    expect(checkPackagingPlatform('mac','win32').ok).toBe(false);
  });

  it('allows cross-built Windows NSIS with an explicit lack-of-validation warning', () => {
    for (const platform of ['linux','darwin'] as const) {
      const check = checkPackagingPlatform('windows',platform);
      expect(check.ok).toBe(true);
      expect(check.message).toContain('real Windows');
      expect(check.message).toContain('signtool');
    }
    expect(checkPackagingPlatform('windows','win32').ok).toBe(true);
  });

  it('keeps Linux packaging bound to Linux and prevents local installer publishing', () => {
    expect(checkPackagingPlatform('linux','linux').ok).toBe(true);
    expect(checkPackagingPlatform('linux','darwin').ok).toBe(false);
    const packageInfo = JSON.parse(readFileSync('package.json','utf8')) as {scripts:Record<string,string>};
    for (const target of ['windows','mac']) {
      expect(packageInfo.scripts['pack:'+target]).toContain('check-packaging-platform.mts '+target);
      expect(packageInfo.scripts['pack:'+target]).toContain('--publish never');
    }
    const macScript = packageInfo.scripts['pack:mac'];
    if (!macScript) throw new Error('Missing macOS pack script');
    expect(macScript.indexOf('check-packaging-platform.mts'))
      .toBeLessThan(macScript.indexOf('pnpm build'));
  });
});
