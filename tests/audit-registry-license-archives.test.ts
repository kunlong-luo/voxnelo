import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { collectLockedPackages, registryArchiveUrl, verifyArchiveBytes } from '../scripts/audit-registry-license-archives.mts';

const bytes = Buffer.from('test archive bytes');
const integrity = 'sha512-' + createHash('sha512').update(bytes).digest('base64');
const pkg = { name: 'react', version: '19.3.1', lockfileIntegrity: integrity };
const lockfile = Buffer.from("lockfileVersion: '9.0'\npackages:\n  react@19.3.1:\n    resolution: {integrity: " + integrity + '}\n');
const digest = createHash('sha256').update(lockfile).digest('hex');
const reports = ['renderer', 'electron', 'audio-worklet'].map(target => ({
  schemaVersion: 3, target, lockfileSha256: digest, legalApproval: false, packages: target === 'renderer' ? [pkg] : [],
}));

describe('registry archive audit', () => {
  it('measures exact bytes and rejects modified archives', () => {
    expect(verifyArchiveBytes(pkg, bytes)).toEqual({
      ...pkg, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), measuredIntegrity: integrity,
    });
    expect(() => verifyArchiveBytes(pkg, Buffer.from('modified'))).toThrow();
  });
  it('only constructs exact public registry package URLs', () => {
    expect(registryArchiveUrl(pkg)).toBe('https://registry.npmjs.org/react/-/react-19.3.1.tgz');
    expect(registryArchiveUrl({ ...pkg, name: '@scope/pkg' })).toBe('https://registry.npmjs.org/@scope/pkg/-/pkg-19.3.1.tgz');
    expect(() => registryArchiveUrl({ ...pkg, name: '../escape' })).toThrow();
    expect(() => registryArchiveUrl({ ...pkg, version: 'latest' })).toThrow();
  });
  it('binds all three reports to the actual lockfile, rejects stale or tampered evidence', () => {
    expect(collectLockedPackages(reports, lockfile)).toEqual([pkg]);
    expect(() => collectLockedPackages(reports.slice(1), lockfile)).toThrow();
    expect(() => collectLockedPackages(reports.map(r => ({ ...r, lockfileSha256: 'stale' })), lockfile)).toThrow();
    expect(() => collectLockedPackages(reports.map(r => ({ ...r, packages: [{ ...pkg, lockfileIntegrity: 'fake' }] })), lockfile)).toThrow();
  });
  it('includes copied-only packed packages and refuses incomplete or stale packed inventories', () => {
    const copied = { name: 'reselect', version: '5.3.0', lockfileIntegrity: integrity };
    const expandedLock = Buffer.concat([lockfile, Buffer.from('  reselect@5.3.0:\n    resolution: {integrity: ' + integrity + '}\n')]);
    const expandedDigest = createHash('sha256').update(expandedLock).digest('hex');
    const inputs = reports.map(r => ({ ...r, lockfileSha256: expandedDigest }));
    const packed = { schemaVersion: 3, target: 'packaged-asar', lockfileSha256: expandedDigest, legalApproval: false, packages: [pkg, copied] };
    expect(collectLockedPackages([...inputs, packed], expandedLock, true)).toEqual([pkg, copied]);
    expect(() => collectLockedPackages(inputs, expandedLock, true)).toThrow();
    expect(() => collectLockedPackages([...inputs, packed], expandedLock)).toThrow();
    expect(() => collectLockedPackages([...inputs, { ...packed, lockfileSha256: digest }], expandedLock, true)).toThrow();
    expect(() => collectLockedPackages([...inputs, { ...packed, packages: [pkg, { ...copied, version: '5.3.1' }] }], expandedLock, true)).toThrow();
  });
});
