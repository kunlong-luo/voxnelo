import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const keyPattern = /^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+@[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.+-]+)?$/i;
const integrityPattern = /^sha512-[A-Za-z0-9+/]{86}==$/;

// Deliberately restricted to pnpm's checked-in v9 generated registry resolution
// syntax, not a general YAML parser. Multiple documents are supported. An
// unsupported resolution must never be interpreted as a matching integrity.
export function indexLockedRegistryPackages(lockfile: string): Map<string, string> {
  const result = new Map<string, string>();
  const seen = new Set<string>();
  let inPackages = false;
  let versionSeen = false;
  let key: string | undefined;
  for (const line of lockfile.split(/\r?\n/)) {
    if (/^---\s*$/.test(line)) {
      inPackages = false;
      versionSeen = false;
      key = undefined;
      continue;
    }
    if (/^lockfileVersion:/.test(line)) {
      assert.match(line, /^lockfileVersion: ['"]?9\.0['"]?\s*$/, 'Unsupported pnpm lockfile version');
      versionSeen = true;
    }
    if (/^\S/.test(line)) {
      inPackages = line === 'packages:';
      key = undefined;
      if (inPackages) assert.ok(versionSeen, 'Missing supported lockfile version');
      continue;
    }
    if (!inPackages) continue;
    if (/^ {2}\S/.test(line)) {
      key = undefined;
      const match = /^ {2}(?:'([^']+)'|([^:'"]+)):\s*$/.exec(line);
      const candidate = match?.[1] ?? match?.[2];
      if (candidate && keyPattern.test(candidate)) key = candidate;
      continue;
    }
    if (!key || !/^ {4}resolution:/.test(line)) continue;
    const match = /^ {4}resolution: \{integrity: (sha512-[A-Za-z0-9+/]{86}==)\}\s*$/.exec(line);
    const integrity = match?.[1];
    // Even a second occurrence with an unsupported resolution is ambiguous.
    if (seen.has(key)) {
      assert.ok(integrity && result.get(key) === integrity, 'Conflicting or unsupported lockfile resolution for ' + key);
    }
    seen.add(key);
    if (integrity) result.set(key, integrity);
  }
  assert.ok(result.size > 0, 'No supported registry package resolutions');
  return result;
}

export function matchLockedPackages<T extends { name: string; version: string }>(
  packages: readonly T[],
  index: ReadonlyMap<string, string>,
): (T & { lockfileIntegrity: string })[] {
  return packages.map(pkg => {
    const key = pkg.name + '@' + pkg.version;
    const integrity = index.get(key);
    assert.ok(integrity && integrityPattern.test(integrity), 'Missing supported exact lockfile resolution for ' + key);
    return { ...pkg, lockfileIntegrity: integrity };
  });
}

export async function bindLockfileEvidence<T extends { name: string; version: string }>(packages: readonly T[]) {
  const bytes = await readFile('pnpm-lock.yaml');
  const index = indexLockedRegistryPackages(bytes.toString('utf8'));
  return {
    packages: matchLockedPackages(packages, index),
    lockfileSha256: createHash('sha256').update(bytes).digest('hex'),
  };
}
