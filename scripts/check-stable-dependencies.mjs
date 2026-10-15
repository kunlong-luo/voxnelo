import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/** Adapted from resume-craft's stable-dependency policy for Voxnelo workspaces. */
const prerelease = /(?:^|[^a-z0-9])(alpha|beta|canary|dev|experimental|legacy|next|nightly|rc)(?:[^a-z0-9]|$)/i;
const sections = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
const manifests = ['package.json'];
const workspace = resolve('packages');

if (existsSync(workspace)) {
  for (const name of readdirSync(workspace)) {
    const path = 'packages/' + name + '/package.json';
    if (existsSync(resolve(path))) manifests.push(path);
  }
}

const violations = [];
for (const path of manifests) {
  const data = JSON.parse(readFileSync(resolve(path), 'utf8'));
  for (const section of sections) {
    for (const [name, spec] of Object.entries(data[section] ?? {})) {
      if (typeof spec !== 'string') continue;
      const value = spec.trim().toLowerCase();
      if (value.startsWith('workspace:') || value === 'latest' || value === 'stable') continue;
      if (prerelease.test(value)) violations.push(path + ': ' + section + ' ' + name + '@' + spec);
    }
  }
  if (typeof data.packageManager === 'string' && prerelease.test(data.packageManager)) {
    violations.push(path + ': packageManager ' + data.packageManager);
  }
}

if (violations.length > 0) {
  console.error('Direct prerelease dependencies are not permitted:');
  for (const violation of violations) console.error('- ' + violation);
  process.exitCode = 1;
} else {
  console.log('Stable dependency check passed (' + manifests.length + ' manifests).');
}
