import { build } from 'esbuild';
import { writeEsbuildLicenseInventory } from './esbuild-license-inventory.mts';

// Public audio worklets cannot load untranspiled TypeScript.
// Generate this browser executable from one typed source on every dev/build.
const result = await build({
  metafile: true,
  entryPoints: ['apps/web/src/audio/pcm-worklet.ts'],
  outfile: 'public/audio/pcm-worklet.js',
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  minify: false,
  logLevel: 'warning',
});
await writeEsbuildLicenseInventory('audio-worklet', [result.metafile]);
