import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { bindLockfileEvidence } from './lockfile-license-evidence.mts';
import type { RsbuildPlugin } from '@rsbuild/core';
import { packageRootForInput } from './esbuild-license-inventory.mts';
import { assertSameNoticeEvidence, readInstalledLicenseIdentity, type PackageLicenseIdentity } from './package-license-evidence.mts';

type StatsModule = {
  nameForCondition?: string | null;
  chunks?: (string | number)[];
  modules?: StatsModule[];
};
type StatsTree = { modules?: StatsModule[]; children?: StatsTree[] };
type Identity = PackageLicenseIdentity;

export async function summarizeRendererPackages(
  stats: StatsTree,
  readIdentity: (root: string, name: string) => Promise<Identity>,
): Promise<{ packages: Identity[]; activeModuleCount: number; unidentifiedModuleCount: number }> {
  const packages = new Map<string, Identity>();
  const cache = new Map<string, Identity>();
  let activeModuleCount = 0;
  let unidentifiedModuleCount = 0;
  async function visit(module: StatsModule, inheritedActive: boolean): Promise<void> {
    const active = Boolean(module.chunks?.length) || inheritedActive;
    if (active) {
      activeModuleCount++;
      const input = module.nameForCondition;
      if (typeof input !== 'string' || !input) {
        unidentifiedModuleCount++;
      } else {
        const pkg = packageRootForInput(input);
        if (pkg) {
          let identity = cache.get(pkg.root);
          if (!identity) {
            identity = await readIdentity(pkg.root, pkg.name);
            assert.equal(identity.name, pkg.name, 'Installed renderer package name differs from module path');
            assert.match(identity.version, /^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.+-]+)?$/, 'Invalid renderer package version');
            cache.set(pkg.root, identity);
          }
          const key = identity.name + '@' + identity.version;
          const prior = packages.get(key);
          if (prior) assertSameNoticeEvidence(prior, identity);
          packages.set(key, identity);
        }
      }
    }
    for (const nested of module.modules ?? []) await visit(nested, active);
  }
  async function compilation(tree: StatsTree): Promise<void> {
    for (const module of tree.modules ?? []) await visit(module, false);
    for (const child of tree.children ?? []) await compilation(child);
  }
  await compilation(stats);
  return {
    packages: [...packages.values()].sort((a, b) => (a.name + '@' + a.version).localeCompare(b.name + '@' + b.version, 'en')),
    activeModuleCount,
    unidentifiedModuleCount,
  };
}

export function rendererLicenseInventory(): RsbuildPlugin {
  return {
    name: 'voxnelo-renderer-license-inventory',
    setup(api) {
      api.onAfterBuild(async ({ stats }) => {
        assert.ok(stats, 'Renderer build stats missing');
        const data = stats.toJson({
          all: false, modules: true, nestedModules: true, orphanModules: true,
          children: true, ids: true, modulesSpace: Infinity, nestedModulesSpace: Infinity,
          groupModulesByAttributes: false, groupModulesByCacheStatus: false,
          groupModulesByExtension: false, groupModulesByLayer: false,
          groupModulesByPath: false, groupModulesByType: false,
        }) as StatsTree;
        const summary = await summarizeRendererPackages(data, readInstalledLicenseIdentity);
        // React is an intentional renderer runtime dependency. An empty or incomplete
        // stats projection must not silently be accepted as a successful inventory.
        assert.ok(summary.packages.some(pkg => pkg.name === 'react'), 'Renderer inventory did not identify React');
        const locked = await bindLockfileEvidence(summary.packages);
        console.log('Lockfile evidence:', locked.packages.length, 'exact registry resolutions matched; archive bytes not independently verified');
        const directory = path.resolve('build', 'license-inventory');
        await mkdir(directory, { recursive: true });
        await writeFile(path.join(directory, 'renderer.json'), JSON.stringify({
          schemaVersion: 3, target: 'renderer', ...summary, ...locked, legalApproval: false,
          scope: 'chunk-associated stats modules and nested members; not exact emitted bytes or complete asset inventory',
        }, null, 2) + '\n');
        console.log('License inventory: renderer', summary.packages.length, 'chunk-associated npm package versions;', summary.unidentifiedModuleCount, 'unidentified active modules;', summary.packages.filter(pkg => !pkg.noticeFiles.length).length, 'without recognized regular root notice files; legal review PENDING');
      });
    },
  };
}
