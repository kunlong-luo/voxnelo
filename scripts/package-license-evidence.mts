import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstat, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

export type NoticeFile = { filename: string; bytes: number; sha256: string };
export type PackageLicenseIdentity = {
  name: string;
  version: string;
  license: string | null;
  noticeFiles: NoticeFile[];
  skippedNoticeCount: number;
};

const MAX_NOTICE_BYTES = 2 * 1024 * 1024;
const noticeName = /^(?:licen[cs]e|copying|notice|copyright)(?:[._ -][a-z0-9._ -]{1,100})?$/i;

export async function readInstalledLicenseIdentity(root: string, name: string): Promise<PackageLicenseIdentity> {
  const metadata = JSON.parse(await readFile(path.resolve(root, 'package.json'), 'utf8')) as {
    name?: unknown; version?: unknown; license?: unknown;
  };
  assert.equal(metadata.name, name, 'Unexpected installed package name');
  assert.ok(typeof metadata.version === 'string', 'Missing package version');
  const license = typeof metadata.license === 'string' &&
    /^[a-zA-Z0-9.+() -]{1,160}$/.test(metadata.license) ? metadata.license : null;
  const noticeFiles: NoticeFile[] = [];
  let skippedNoticeCount = 0;
  const entries = (await readdir(root, { withFileTypes: true }))
    .filter(entry => noticeName.test(entry.name))
    .sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  for (const entry of entries) {
    // Never follow notice symlinks or descend into directories. The report
    // records the limitation instead of treating it as a missing obligation.
    if (!entry.isFile()) {
      skippedNoticeCount++;
      continue;
    }
    const filename = path.join(root, entry.name);
    const info = await lstat(filename);
    if (!info.isFile() || info.size === 0 || info.size > MAX_NOTICE_BYTES) {
      skippedNoticeCount++;
      continue;
    }
    const bytes = await readFile(filename);
    assert.equal(bytes.length, info.size, 'Notice changed while reading');
    noticeFiles.push({
      filename: entry.name,
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    });
  }
  return { name, version: metadata.version, license, noticeFiles, skippedNoticeCount };
}

export function assertSameNoticeEvidence(a: PackageLicenseIdentity, b: PackageLicenseIdentity): void {
  assert.equal(a.license, b.license, 'Conflicting license metadata for package version');
  assert.deepEqual(a.noticeFiles, b.noticeFiles, 'Conflicting notice bytes for package version');
  assert.equal(a.skippedNoticeCount, b.skippedNoticeCount, 'Conflicting skipped notice count for package version');
}
