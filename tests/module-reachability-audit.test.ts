import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  auditModuleReachability,
  discoverBundledEntrypoints,
  scanModuleSpecifiers,
  traceModules,
} from '../scripts/audit-module-reachability.mts';

describe('Read-only module reachability audit', () => {
  it('reads import/export edges, literal dynamic imports and CommonJS require without counting text comments', () => {
    const source = [
      "// import './fictional';",
      "import type { Foo } from './types';",
      "import './side-effect';",
      "export { helper } from './barrel';",
      "const lazy = import('./lazy');",
      "const legacy = require('./legacy');",
      "const unknown = import(variable);",
    ].join('\n');
    expect(scanModuleSpecifiers(source, 'sample.ts')).toEqual({
      specifiers: ['./barrel', './lazy', './legacy', './side-effect', './types'],
      nonLiteralImports: true,
    });
    expect(scanModuleSpecifiers("const found = import.meta.glob('./features/*.ts');")
      .nonLiteralImports).toBe(true);
  });

  it('walks cycles and does not accidentally reach disconnected or test-only modules', () => {
    const graph = new Map([
      ['entry', ['component']],
      ['component', ['lib']],
      ['lib', ['component']],
      ['test', ['fixture']],
      ['dead', []],
    ]);
    expect([...traceModules(['entry'], graph)].sort()).toEqual(['component', 'entry', 'lib']);
    expect(traceModules(['entry', 'test'], graph).has('fixture')).toBe(true);
    expect(traceModules(['entry', 'test'], graph).has('dead')).toBe(false);
  });

  it('discovers the renderer, AudioWorklet, Electron/ASR Worker and installer bundle roots', () => {
    const root = path.resolve('.');
    const paths = ['rsbuild.config.ts', 'scripts/build-electron.mts', 'scripts/build-audio-worklet.mts'];
    const sources = Object.fromEntries(paths.map(file => [file, readFileSync(path.join(root, file), 'utf8')]));
    const entries = discoverBundledEntrypoints(sources);
    for (const required of [
      'apps/web/src/main.tsx', 'apps/web/src/audio/pcm-worklet.ts',
      'apps/desktop/main.ts', 'apps/desktop/preload.ts',
      'apps/desktop/offlineAsrWorker.ts', 'apps/desktop/moonshineAsrWorker.ts',
      'scripts/install-moonshine-linux.mts',
    ]) expect(entries).toContain(required);
  });

  it('keeps both native ASR Workers out of any unreferenced candidate list', () => {
    const report = auditModuleReachability(path.resolve('.'));
    expect(report.productionEntrypoints).toContain('apps/desktop/offlineAsrWorker.ts');
    expect(report.productionEntrypoints).toContain('apps/desktop/moonshineAsrWorker.ts');
    expect(report.reviewCandidates).not.toContain('apps/desktop/offlineAsrWorker.ts');
    expect(report.reviewCandidates).not.toContain('apps/desktop/moonshineAsrWorker.ts');
    expect(report.sourceModuleCount).toBeGreaterThan(50);
  });
});
