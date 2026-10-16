import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

/**
 * Adapted from resume-craft's performance budgets.
 * Only measures the shipped Rsbuild renderer in dist, not the Electron installer.
 */
const dir = resolve('dist');
const reportOnly = process.argv.includes('--report-only');
const KiB = 1024;
const budgets = {
  jsGzip: 169,       // U3 visual parity: compact static SVG ribbon adds ~0.2 KiB gzip over 168; no runtime animation/audio SDK
  cssGzip: 24,       // 2026-10-15 baseline: about 6 KiB
  rendererGzip: 240, // HTML, CSS, JS and public brand assets
};

if (!existsSync(join(dir, 'index.html'))) {
  console.error('No dist/index.html: run pnpm build first.');
  process.exit(1);
}

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const files = walk(dir).map((path) => ({
  rel: relative(dir, path).replaceAll('\\', '/'),
  gzip: gzipSync(readFileSync(path), { level: 9 }).byteLength,
}));
type FileSize = (typeof files)[number];
const kib = (predicate: (file: FileSize) => boolean) => files.filter(predicate)
  .reduce((total, file) => total + file.gzip, 0) / KiB;

const values = {
  jsGzip: kib((file) => /\.(?:js|mjs)$/i.test(file.rel)),
  cssGzip: kib((file) => /\.css$/i.test(file.rel)),
  rendererGzip: kib(() => true),
};

console.log('\nVoxnelo renderer performance: ' + (reportOnly ? 'report only' : 'enforced'));
const violations = [];
for (const name of Object.keys(values) as Array<keyof typeof budgets>) {
  const amount = values[name];
  console.log(name + ': ' + amount.toFixed(1) + ' KiB / ' + budgets[name] + ' KiB');
  if (amount > budgets[name]) {
    violations.push(name + ' is over budget (' + amount.toFixed(1) + ' KiB).');
  }
}
for (const file of files.filter((f) => /\.(?:js|mjs)$/i.test(f.rel))
  .sort((a, b) => b.gzip - a.gzip).slice(0, 5)) {
  console.log('JS: ' + (file.gzip / KiB).toFixed(1) + ' KiB gzip — ' + file.rel);
}
if (violations.length > 0) {
  for (const message of violations) console.error(message);
  if (!reportOnly) process.exitCode = 1;
} else {
  console.log('Renderer performance budget passed.');
}
