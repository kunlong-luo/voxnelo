import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { assertSameNoticeEvidence, readInstalledLicenseIdentity } from '../scripts/package-license-evidence.mts';

describe('installed package notice evidence', () => {
  it('hashes original bytes, omits paths/text and counts skipped root candidates', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'voxnelo-notices-'));
    try {
      await writeFile(path.join(root, 'package.json'), JSON.stringify({ name: 'demo', version: '1.0.0', license: 'MIT' }));
      const original = Buffer.from('Original notice\r\n');
      await writeFile(path.join(root, 'LICENSE.txt'), original);
      await writeFile(path.join(root, 'COPYING'), '');
      await mkdir(path.join(root, 'NOTICE'));
      await writeFile(path.join(root, 'README.md'), 'not a notice');
      const evidence = await readInstalledLicenseIdentity(root, 'demo');
      expect(evidence.noticeFiles).toEqual([{
        filename: 'LICENSE.txt', bytes: original.length,
        sha256: createHash('sha256').update(original).digest('hex'),
      }]);
      expect(evidence.skippedNoticeCount).toBe(2);
      expect(JSON.stringify(evidence)).not.toContain(root);
      expect(JSON.stringify(evidence)).not.toContain('Original notice');
      expect(() => assertSameNoticeEvidence(evidence, { ...evidence, noticeFiles: [] })).toThrow();
      await expect(readInstalledLicenseIdentity(root, 'different')).rejects.toThrow();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('reports an empty evidence list rather than inventing a license file', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'voxnelo-notices-'));
    try {
      await writeFile(path.join(root, 'package.json'), JSON.stringify({ name: 'demo', version: '1.0.0', license: 'MIT' }));
      const evidence = await readInstalledLicenseIdentity(root, 'demo');
      expect(evidence.noticeFiles).toEqual([]);
      expect(evidence.skippedNoticeCount).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
