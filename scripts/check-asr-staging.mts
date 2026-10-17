#!/usr/bin/env node
/**
 * Release preflight for explicitly staged offline ASR assets.
 * CI's default README-only staging is valid (ASR deliberately unavailable).
 * A release with ANY staged assets must have a complete SHA-256 manifest.
 * This verifies integrity, not licenses, signatures, model quality or ABI.
 */
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? 'build/offline-asr');
const mandatory = [
  'native/index.cjs',
  'model/encoder.onnx',
  'model/decoder.onnx',
  'model/joiner.onnx',
  'model/tokens.txt',
];
const shaPattern = /^[0-9a-f]{64}$/i;
const relativePathPattern = /^(?:model|native)\/[a-zA-Z0-9_@+./-]+$/;

function safeRelative(name: string): boolean {
  return relativePathPattern.test(name)
    && !name.split('/').some(component => component === '.' || component === '..' || component === '');
}

async function listFiles(dir: string, prefix = ''): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const result: string[] = [];
  for (const entry of entries) {
    if (entry.isSymbolicLink()) throw Error('ASR staging may not contain symlinks: ' + entry.name);
    const name = prefix ? prefix + '/' + entry.name : entry.name;
    if (entry.isDirectory()) result.push(...await listFiles(path.join(dir, entry.name), name));
    else if (entry.isFile()) result.push(name);
    else throw Error('Unexpected ASR file type: ' + name);
  }
  return result;
}
function checkedRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid ASR manifest object');
  return value as Record<string, unknown>;
}
async function digest(filename: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filename)) hash.update(chunk as Buffer);
  return hash.digest('hex');
}
function requiredText(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string' || !value.trim()) throw Error('Missing ASR release metadata: ' + key);
  return value;
}

const files = (await listFiles(root)).sort();
const payload = files.filter(file => file !== 'README.md' && file !== 'manifest.json');
if (payload.length === 0 && !files.includes('manifest.json')) {
  console.log('ASR staging: no optional engine/model included (offline recognition disabled).');
} else {
  if (!files.includes('manifest.json')) throw Error('Partial ASR assets staged without manifest.json');
  const manifest = checkedRecord(JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8')) as unknown);
  requiredText(manifest, 'modelId');
  requiredText(manifest, 'modelSource');
  requiredText(manifest, 'modelLicense');
  requiredText(manifest, 'nativePackage');
  requiredText(manifest, 'nativeVersion');
  requiredText(manifest, 'nativeLicense');
  const modelRevision = requiredText(manifest, 'modelRevision');
  if (!/^[a-f0-9]{40}$/i.test(modelRevision)) throw Error('Pin modelRevision to a full upstream Git commit SHA');

  const hashes = checkedRecord(manifest.sha256);
  const declared = Object.keys(hashes).sort();
  if (declared.length !== payload.length || declared.some((name, i) => name !== payload[i])) {
    throw Error('ASR manifest must name exactly every staged model/native file (no extras or omissions)');
  }
  for (const file of mandatory) {
    if (!declared.includes(file)) throw Error('Missing required ASR file: ' + file);
  }
  if (!declared.some(file => file.startsWith('native/') && file.endsWith('.node'))) {
    throw Error('Missing platform-native sherpa-onnx .node module');
  }
  for (const file of declared) {
    if (!safeRelative(file)) throw Error('Unsafe staged ASR path: ' + file);
    const expected = hashes[file];
    if (typeof expected !== 'string' || !shaPattern.test(expected)) throw Error('Invalid SHA-256 for ' + file);
    const filename = path.join(root, ...file.split('/'));
    if ((await stat(filename)).size === 0) throw Error('Empty ASR asset: ' + file);
    if (await digest(filename) !== expected.toLowerCase()) throw Error('ASR checksum mismatch: ' + file);
  }
  console.log('ASR release staging integrity passed:', payload.length, 'files; licensing and real-model QA still required.');
}
