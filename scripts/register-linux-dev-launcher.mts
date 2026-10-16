#!/usr/bin/env node
/**
 * Optional, user-scoped desktop integration for running Voxnelo from sources.
 * Wayland docks identify an app by its .desktop filename, not only BrowserWindow.icon.
 * No sudo, no global writes, and only our one known launcher file is touched.
 */
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'linux') {
  console.log('This launcher is only needed on Linux.');
  process.exit(0);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataHome = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
const destination = path.join(dataHome, 'applications', 'app.voxnelo.desktop.desktop');
const icon = path.join(root, 'build', 'icon.png');
const operation = process.argv[2];

if (operation === '--remove') {
  await rm(destination, { force: true });
  console.log('Removed Voxnelo development launcher:', destination);
  process.exit(0);
}
if (operation !== undefined) {
  console.error('Usage: node --experimental-strip-types scripts/register-linux-dev-launcher.mts [--remove]');
  process.exit(1);
}

await access(icon);
function desktopValue(value: string): string {
  // Reject control characters that could inject additional .desktop fields.
  if (/[\r\n]/.test(value)) throw new Error('Invalid path containing a newline');
  return value;
}
function execArg(value: string): string {
  return '"' + desktopValue(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/%/g, '%%') + '"';
}
const entry = [
  '[Desktop Entry]',
  'Type=Application',
  'Version=1.0',
  'Name=Voxnelo (Development)',
  'Comment=Local-first English speaking practice (development)',
  'Icon=' + desktopValue(icon),
  'Exec=/usr/bin/env pnpm --dir ' + execArg(root) + ' dev',
  'Path=' + desktopValue(root),
  'StartupWMClass=app.voxnelo.desktop',
  'Categories=Education;',
  'Terminal=false',
  '',
].join('\n');

await mkdir(path.dirname(destination), { recursive: true });
// Never overwrite an unrelated hand-maintained launcher.
let previous: string | undefined;
try { previous = await readFile(destination, 'utf8'); }
catch (error) { if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error; }
if (previous && previous !== entry && !previous.includes('Name=Voxnelo (Development)')) {
  throw new Error('Refusing to overwrite another launcher: ' + destination);
}
await writeFile(destination, entry, { encoding: 'utf8', mode: 0o644 });
console.log('Registered Voxnelo dev launcher for Linux docks:', destination);
console.log('Start pnpm dev again, or launch it from your app menu, to apply the app icon.');
