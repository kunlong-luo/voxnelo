import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Metafile } from 'esbuild';
import { assertSameNoticeEvidence, readInstalledLicenseIdentity, type PackageLicenseIdentity } from './package-license-evidence.mts';

type PackageEntry = PackageLicenseIdentity & { contributedBytes: number };
type PackageIdentity = PackageLicenseIdentity;

export function packageRootForInput(input: string): { root: string; name: string } | null {
  const parts = input.replaceAll('\\', '/').split('/');
  const index = parts.lastIndexOf('node_modules');
  if (index < 0) return null;
  const first = parts[index + 1];
  assert.ok(first && !first.startsWith('.'), 'Unrecognized node_modules input');
  const count = first.startsWith('@') ? 2 : 1;
  const name = parts.slice(index + 1, index + 1 + count).join('/');
  assert.match(name, /^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/i, 'Invalid package name');
  assert.ok(parts.length > index + 1 + count, 'Missing package input file');
  return { root: parts.slice(0, index + 1 + count).join('/'), name };
}

export async function summarizeBundledPackages(
  metafiles: readonly Metafile[],
  readIdentity: (root: string, name: string) => Promise<PackageIdentity>,
): Promise<{ packages: PackageEntry[]; externalImportCount: number }> {
  const totals = new Map<string, PackageEntry>();
  const identities = new Map<string, PackageIdentity>();
  let externalImportCount = 0;
  for (const meta of metafiles) {
    for (const output of Object.values(meta.outputs)) {
      externalImportCount += output.imports.filter(entry => entry.external).length;
      for (const [input, contribution] of Object.entries(output.inputs)) {
        if (contribution.bytesInOutput <= 0) continue;
        const pkg = packageRootForInput(input);
        if (!pkg) continue;
        let identity = identities.get(pkg.root);
        if (!identity) {
          identity = await readIdentity(pkg.root, pkg.name);
          assert.equal(identity.name, pkg.name, 'Installed package name differs from path');
          assert.match(identity.version, /^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.+-]+)?$/, 'Invalid package version');
          identities.set(pkg.root, identity);
        }
        const key = identity.name + '@' + identity.version;
        const prior = totals.get(key);
        if (prior) {
          assertSameNoticeEvidence(prior, identity);
          prior.contributedBytes += contribution.bytesInOutput;
        } else {
          totals.set(key, { ...identity, contributedBytes: contribution.bytesInOutput });
        }
      }
    }
  }
  return {
    packages: [...totals.values()].sort((a, b) => (a.name + '@' + a.version).localeCompare(b.name + '@' + b.version, 'en')),
    externalImportCount,
  };
}

export async function writeEsbuildLicenseInventory(
  target: 'electron' | 'audio-worklet',
  metafiles: readonly Metafile[],
): Promise<void> {
  const summary = await summarizeBundledPackages(metafiles, readInstalledLicenseIdentity);
  const directory = path.resolve('build', 'license-inventory');
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, target + '.json'), JSON.stringify({
    schemaVersion: 2, target, ...summary, legalApproval: false,
    scope: 'esbuild positive emitted bytes only; excludes renderer, external and copied assets',
  }, null, 2) + '\n');
  console.log('License inventory:', target, summary.packages.length, 'bundled npm package versions;', summary.packages.filter(pkg => !pkg.noticeFiles.length).length, 'without recognized regular root notice files; legal review PENDING');
}
