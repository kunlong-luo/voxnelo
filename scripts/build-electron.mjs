import { build } from 'esbuild';
import path from 'node:path';

const workspace = (name) => path.resolve(`packages/${name}/index.ts`);

const common = {
  bundle: true,
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
};
await Promise.all([
  build({ ...common, entryPoints: ['apps/desktop/main.ts'], outfile: 'dist-electron/main.cjs' }),
  build({ ...common, entryPoints: ['apps/desktop/preload.ts'], outfile: 'dist-electron/preload.cjs' }),
]);
