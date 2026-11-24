import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { indexLockedRegistryPackages } from './lockfile-license-evidence.mts';

const MAX_ARCHIVE_BYTES = 64 * 1024 * 1024;
const targets = ['renderer', 'electron', 'audio-worklet'] as const;
const namePattern = /^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/;
const versionPattern = /^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.+-]+)?$/;
const sriPattern = /^sha512-[A-Za-z0-9+/]{86}==$/;

type LockedPackage = { name: string; version: string; lockfileIntegrity: string };
type ArchiveEvidence = LockedPackage & { bytes: number; sha256: string; measuredIntegrity: string };
type Report = { schemaVersion?: unknown; target?: unknown; lockfileSha256?: unknown; legalApproval?: unknown; packages?: unknown };

export function registryArchiveUrl(pkg: LockedPackage): string {
  assert.match(pkg.name, namePattern, 'Unsupported registry name');
  assert.match(pkg.version, versionPattern, 'Unsupported registry version');
  const basename = pkg.name.split('/').at(-1);
  assert.ok(basename);
  return 'https://registry.npmjs.org/' + pkg.name + '/-/' + basename + '-' + pkg.version + '.tgz';
}

export function verifyArchiveBytes(pkg: LockedPackage, bytes: Uint8Array): ArchiveEvidence {
  assert.match(pkg.lockfileIntegrity, sriPattern, 'Unsupported SHA-512 integrity');
  assert.ok(bytes.length > 0 && bytes.length <= MAX_ARCHIVE_BYTES, 'Archive size outside audit bounds');
  const measuredIntegrity = 'sha512-' + createHash('sha512').update(bytes).digest('base64');
  assert.equal(measuredIntegrity, pkg.lockfileIntegrity, 'Registry archive integrity mismatch for ' + pkg.name + '@' + pkg.version);
  return { ...pkg, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), measuredIntegrity };
}

export function collectLockedPackages(reports: readonly Report[], lockfileBytes: Uint8Array): LockedPackage[] {
  const digest = createHash('sha256').update(lockfileBytes).digest('hex');
  const index = indexLockedRegistryPackages(Buffer.from(lockfileBytes).toString('utf8'));
  const packages = new Map<string, LockedPackage>();
  const seenTargets = new Set<string>();
  for (const report of reports) {
    assert.equal(report.schemaVersion, 3, 'Rebuild schema 3 inventories first');
    assert.equal(report.legalApproval, false, 'Unexpected approval in input inventory');
    assert.ok(typeof report.target === 'string' && targets.some(t => t === report.target), 'Unexpected build inventory target');
    assert.ok(!seenTargets.has(report.target), 'Duplicate build inventory target');
    seenTargets.add(report.target);
    assert.equal(report.lockfileSha256, digest, 'Stale build inventory lockfile digest');
    assert.ok(Array.isArray(report.packages), 'Missing inventory packages');
    for (const value of report.packages as unknown[]) {
      assert.ok(value && typeof value === 'object', 'Invalid package entry');
      const p = value as Partial<LockedPackage>;
      assert.ok(typeof p.name === 'string' && typeof p.version === 'string' && typeof p.lockfileIntegrity === 'string');
      const pkg = { name: p.name, version: p.version, lockfileIntegrity: p.lockfileIntegrity };
      registryArchiveUrl(pkg);
      const key = pkg.name + '@' + pkg.version;
      assert.ok(sriPattern.test(pkg.lockfileIntegrity) && index.get(key) === pkg.lockfileIntegrity, 'Inventory differs from exact locked integrity for ' + key);
      packages.set(key, pkg);
    }
  }
  assert.equal(seenTargets.size, targets.length, 'Missing build inventory target');
  assert.ok([...packages.values()].some(pkg => pkg.name === 'react'), 'Missing required renderer dependency');
  return [...packages.values()].sort((a, b) => (a.name + '@' + a.version).localeCompare(b.name + '@' + b.version, 'en'));
}

async function downloadRegistryArchive(pkg: LockedPackage): Promise<Uint8Array> {
  // Explicit opt-in command only. No credentials, arbitrary URLs or redirects.
  const response = await fetch(registryArchiveUrl(pkg), {
    redirect: 'error', signal: AbortSignal.timeout(60_000),
  });
  assert.ok(response.ok && response.body, 'Registry archive unavailable for ' + pkg.name + '@' + pkg.version);
  const declared = response.headers.get('content-length');
  if (declared !== null) assert.ok(Number(declared) <= MAX_ARCHIVE_BYTES, 'Archive exceeds audit bound');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      size += item.value.byteLength;
      assert.ok(size <= MAX_ARCHIVE_BYTES, 'Archive exceeds audit bound');
      chunks.push(item.value);
    }
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
  return Buffer.concat(chunks, size);
}

export async function auditRegistryArchives(): Promise<void> {
  const directory = path.resolve('build', 'license-inventory');
  const output = path.join(directory, 'registry-archives.json');
  // Never leave an older successful report looking current after a failed audit.
  await rm(output, { force: true });
  const lockfile = await readFile('pnpm-lock.yaml');
  const reports = await Promise.all(targets.map(async target =>
    JSON.parse(await readFile(path.join(directory, target + '.json'), 'utf8')) as Report,
  ));
  const packages = collectLockedPackages(reports, lockfile);
  const archives: ArchiveEvidence[] = [];
  for (const pkg of packages) {
    archives.push(verifyArchiveBytes(pkg, await downloadRegistryArchive(pkg)));
    console.log('Registry archive verified:', pkg.name + '@' + pkg.version);
  }
  await mkdir(directory, { recursive: true });
  await writeFile(output, JSON.stringify({
    schemaVersion: 1, lockfileSha256: createHash('sha256').update(lockfile).digest('hex'),
    archiveIntegrityVerified: true, legalApproval: false, archives,
    scope: 'explicit registry archive digest verification; no installed file or notice equivalence',
  }, null, 2) + '\n');
  console.log('Verified registry archives:', archives.length, '; legal review PENDING');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await auditRegistryArchives();
}
