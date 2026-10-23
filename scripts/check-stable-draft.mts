#!/usr/bin/env node
/** A draft release has target_commitish but may not have a Git tag until publication. */
import { appendFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

type Row = Record<string, unknown>;
const asRecord = (raw: unknown): Row =>
  raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Row : {};
const asString = (raw: unknown) => typeof raw === 'string' ? raw : '';
const safeName = (raw: unknown) => /^[A-Za-z0-9_.-]+$/.test(asString(raw));
const SHA = /^[a-f0-9]{40}$/;
const platforms = ['linux', 'win32', 'darwin'] as const;

export function stableDraftBlockers(rawReleases: unknown, rawApproval: unknown, version: string): string[] {
  const failures: string[] = [];
  const approval = asRecord(rawApproval);
  const matches = Array.isArray(rawReleases)
    ? rawReleases.filter(release => asRecord(release).tag_name === 'v' + version)
    : [];
  if (matches.length !== 1) {
    failures.push('Exactly one draft for the exact version is required');
    return failures;
  }
  const release = asRecord(matches[0]);
  const target = asString(release.target_commitish);
  if (release.draft !== true || release.prerelease !== true)
    failures.push('Candidate must remain a private prerelease draft');
  if (approval.version !== version || !SHA.test(target) || approval.sourceCommit !== target)
    failures.push('Draft target_commitish must equal the exact approved full source SHA');
  if (!Number.isSafeInteger(release.id) || Number(release.id) <= 0)
    failures.push('Draft Release numeric ID is invalid');

  const expectedNames = new Set<string>();
  for (const platform of platforms) {
    expectedNames.add('SHA256SUMS-' + platform + '.txt');
    const entries = asRecord(approval.artifacts)[platform];
    if (!Array.isArray(entries)) {
      failures.push('Approved artifact inventory missing for ' + platform);
      continue;
    }
    for (const raw of entries) {
      const name = asString(asRecord(raw).name);
      if (!safeName(name) || expectedNames.has(name))
        failures.push('Unsafe or duplicated approved installer name ' + name);
      expectedNames.add(name);
    }
  }

  const assets = release.assets;
  if (!Array.isArray(assets)) {
    failures.push('Draft Release assets are missing');
    return failures;
  }
  const actualNames = new Set<string>();
  for (const raw of assets) {
    const asset = asRecord(raw), name = asString(asset.name);
    if (!safeName(name) || actualNames.has(name) || asset.state !== 'uploaded' ||
        !Number.isSafeInteger(asset.id) || Number(asset.id) <= 0 ||
        !Number.isSafeInteger(asset.size) || Number(asset.size) <= 0)
      failures.push('Unsafe, duplicate, empty or unfinished draft attachment ' + name);
    actualNames.add(name);
    if (/\.(exe|dmg|deb|AppImage)$/i.test(name) && !expectedNames.has(name))
      failures.push('Unapproved executable attachment ' + name);
  }
  for (const name of expectedNames) if (!actualNames.has(name))
    failures.push('Required approved draft attachment is missing: ' + name);
  return failures;
}

async function main(): Promise<void> {
  const [releasesFile, approvalFile, version] = process.argv.slice(2);
  if (!releasesFile || !approvalFile || !version)
    throw Error('Usage: check-stable-draft.mts releases.json approved-evidence.json X.Y.Z');
  const releases = JSON.parse(readFileSync(releasesFile, 'utf8')) as unknown;
  const approval = JSON.parse(readFileSync(approvalFile, 'utf8')) as unknown;
  const failures = stableDraftBlockers(releases, approval, version);
  if (failures.length) throw Error('Stable draft BLOCKED:\n- ' + failures.join('\n- '));
  const draft = (releases as Row[]).find(r => asRecord(r).tag_name === 'v' + version)!;
  const sourceCommit = asString(draft.target_commitish);
  if (!process.env.GITHUB_ENV) throw Error('GITHUB_ENV is required for a CI-only validation');
  appendFileSync(process.env.GITHUB_ENV, 'RELEASE_COMMIT=' + sourceCommit + '\n');
  console.log('Private draft target verified without requiring a Git tag: ' + sourceCommit);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch(e => { console.error(String(e)); process.exitCode = 1; });
