import { build, type BuildOptions } from 'esbuild';
import path from 'node:path';
import { writeEsbuildLicenseInventory } from './esbuild-license-inventory.mts';

const workspace = (name: string) => path.resolve(`packages/${name}/index.ts`);

const common = {
  bundle: true,
  metafile: true as const,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  external: ['electron'],
  sourcemap: false,
  logLevel: 'info',
  alias: {
    '@voxnelo/audio': workspace('audio'),
    '@voxnelo/content': workspace('content'),
    '@voxnelo/core': workspace('core'),
    '@voxnelo/learning': workspace('learning'),
    '@voxnelo/storage': workspace('storage'),
  },
} satisfies BuildOptions;
const results = await Promise.all([
  build({ ...common, entryPoints: ['apps/desktop/main.ts'], outfile: 'dist-electron/main.cjs' }),
  build({ ...common, entryPoints: ['apps/desktop/preload.ts'], outfile: 'dist-electron/preload.cjs' }),
  build({ ...common, entryPoints: ['apps/desktop/offlineAsrWorker.ts'], outfile: 'dist-electron/offlineAsrWorker.cjs' }),
  build({ ...common, entryPoints: ['apps/desktop/moonshineAsrWorker.ts'], outfile: 'dist-electron/moonshineAsrWorker.cjs' }),
  build({ ...common, format: 'cjs', entryPoints: ['scripts/install-moonshine-linux.mts'], outfile: 'dist-electron/moonshineInstaller.cjs' }),
]);
await writeEsbuildLicenseInventory('electron', results.map(result => result.metafile));
