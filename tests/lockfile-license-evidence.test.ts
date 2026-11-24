import { describe, expect, it } from 'vitest';
import { indexLockedRegistryPackages, matchLockedPackages } from '../scripts/lockfile-license-evidence.mts';

const a = 'sha512-' + 'A'.repeat(86) + '==';
const b = 'sha512-' + 'B'.repeat(86) + '==';
const doc = (key: string, integrity: string) =>
  "---\nlockfileVersion: '9.0'\npackages:\n\n  " + key + ':\n    resolution: {integrity: ' + integrity + '}\n';

describe('locked registry package evidence', () => {
  it('matches exact scoped and unscoped versions across pnpm documents, not snapshots', () => {
    const index = indexLockedRegistryPackages(doc('pnpm@12.22.0', a) +
      doc("'@scope/pkg@1.2.3'", b) +
      '\nsnapshots:\n  other@1.0.0:\n    resolution: {integrity: ' + a + '}\n');
    expect(matchLockedPackages([{ name: '@scope/pkg', version: '1.2.3' }], index))
      .toEqual([{ name: '@scope/pkg', version: '1.2.3', lockfileIntegrity: b }]);
    expect(index.get('pnpm@12.22.0')).toBe(a);
    expect(index.has('other@1.0.0')).toBe(false);
    expect(() => matchLockedPackages([{ name: '@scope/pkg', version: '1.2.4' }], index)).toThrow();
  });

  it('rejects conflicting and unsupported duplicate resolutions', () => {
    expect(() => indexLockedRegistryPackages(doc('pkg@1.0.0', a) + doc('pkg@1.0.0', b))).toThrow();
    expect(() => indexLockedRegistryPackages(doc('pkg@1.0.0', a) + doc('pkg@1.0.0', 'sha1-invalid'))).toThrow();
    expect(indexLockedRegistryPackages(doc('pkg@1.0.0', a) + doc('pkg@1.0.0', a)).get('pkg@1.0.0')).toBe(a);
  });

  it('rejects unsupported formats and does not treat a tarball URL as registry integrity', () => {
    expect(() => indexLockedRegistryPackages(doc('pkg@1.0.0', a).replace('9.0', '8.0'))).toThrow();
    const index = indexLockedRegistryPackages(doc('pkg@1.0.0', a) +
      "  custom@2.0.0:\n    resolution: {tarball: https://example.invalid/custom.tgz}\n");
    expect(() => matchLockedPackages([{ name: 'custom', version: '2.0.0' }], index)).toThrow();
  });
});
