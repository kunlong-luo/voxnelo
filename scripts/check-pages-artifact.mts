#!/usr/bin/env node
/**
 * Static-hosting smoke test for the GitHub Pages project subdirectory.
 * Never publishes content, modifies repository settings, or uses a network.
 */
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const dist = path.resolve('dist');
const html = await readFile(path.join(dist, 'index.html'), 'utf8');
const branded = path.join(dist, 'brand', 'voxnelo-mark.svg');
if (!(await stat(branded)).isFile()) throw new Error('Missing branded icon in static output');
if (!html.includes('rel="icon"') || !html.includes('href="brand/voxnelo-mark.svg"')) {
  throw new Error('Missing project-relative favicon');
}
const assets = [...html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)].flatMap(m => m[1] ? [m[1]] : []);
for (const ref of assets) {
  if (/^(?:#|data:|https?:)/.test(ref)) continue;
  if (ref.startsWith('/')) throw new Error('Root-absolute static path breaks /voxnelo/: ' + ref);
  const resolved = new URL(ref, 'https://example.github.io/voxnelo/');
  if (!resolved.pathname.startsWith('/voxnelo/')) throw new Error('Asset escaped site folder: ' + ref);
}
if (!/src=["'][^"']+\.js(?:["'?]|\?)/.test(html)) {
  throw new Error('Renderer JavaScript was not emitted in the HTML');
}
console.log('Pages build looks correct for /voxnelo/:', assets.length, 'HTML assets; branded icon copied.');
