import { build } from 'esbuild';

const common = {
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  external: ['electron'],
  sourcemap: false,
  logLevel: 'info',
};
await Promise.all([
  build({ ...common, entryPoints: ['apps/desktop/main.ts'], outfile: 'dist-electron/main.cjs' }),
  build({ ...common, entryPoints: ['apps/desktop/preload.ts'], outfile: 'dist-electron/preload.cjs' }),
]);
