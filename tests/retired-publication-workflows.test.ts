import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Immutable Git blob IDs from main before archival (2026-11-21).
 * Use Git's "blob <bytes>\0<content>" object encoding, not a release
 * checksum; the archive itself is never executed as a workflow.
 */
const HISTORICAL_RELEASE_WORKFLOWS = [
  ['publish-linux-v0.1.5.yml', 'fcfd6ed03b6481a308e6e6bb5ef525d35f6b29de'],
  ['publish-all-v0.1.6.yml', '23a28463f3cee1808cbbd7d5678dfd76b9d3abcc'],
  ['prepare-v0.1.7-draft-once.yml', 'a207836e5bdf2f00694a82e0285868ed0b8f84dd'],
  ['publish-all-v1.0.0.yml', '9f5e1a3b8f6bca49bd645966af34056c0a21651e'],
  ['publish-all-v1.0.1.yml', '2a60698062226492b8ef3159704290ece9712630'],
  ['publish-all-v1.0.2.yml', '9b0530e1246903a1085765ffd66ad1fc0809303b'],
  ['publish-all-v1.0.3.yml', '493ab7371b9b22427fa669e3247c38703d75127f'],
] as const;

function gitBlobId(bytes: Buffer): string {
  return createHash('sha1')
    .update(Buffer.from('blob ' + bytes.length + '\0'))
    .update(bytes)
    .digest('hex');
}

describe('retired version-specific publication workflows are inert, unchanged archival records', () => {
  it.each(HISTORICAL_RELEASE_WORKFLOWS)('%s is absent from executable Actions and preserved byte-for-byte', (name, originalBlobId) => {
    const livePath = path.join('.github', 'workflows', name);
    const archivedPath = path.join('docs', 'archive', 'workflows', name);
    expect(existsSync(livePath), 'An old release workflow must never be dispatchable').toBe(false);
    expect(existsSync(archivedPath), 'Missing historical source evidence').toBe(true);

    const bytes = readFileSync(archivedPath);
    expect(gitBlobId(bytes), 'Historical release code differs from original Git blob').toBe(originalBlobId);
    const source = bytes.toString('utf8');
    expect(source).toContain('workflow_dispatch:');
    expect(source).not.toMatch(/^\s+push:/m);
    expect(source).toMatch(/^\s+if:\s*false\b/m);
    expect(source).toContain('contents: write');
  });

  it('keeps current draft and QA workflows available and separate from historical scripts', () => {
    for (const file of ['release-draft.yml', 'v1.0.4-review-installers.yml', 'ci.yml', 'stable-readiness.yml']) {
      expect(existsSync(path.join('.github', 'workflows', file))).toBe(true);
    }
  });
});
