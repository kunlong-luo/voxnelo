import { build } from 'esbuild';

// Public audio worklets cannot load untranspiled TypeScript.
// Generate this browser executable from one typed source on every dev/build.
await build({
  entryPoints: ['apps/web/src/audio/pcm-worklet.ts'],
  outfile: 'public/audio/pcm-worklet.js',
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  minify: false,
  logLevel: 'warning',
});
