import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Only maintained workflows are checked. Historical one-time publish
 * workflows remain archival evidence. The active read-only v1.0.4 reviewer
 * workflow MUST stay pinned to the current runtime while the candidate is
 * being prepared; it is not a retired publication job.
 */
export const MAINTAINED_WORKFLOWS = [
  { path: '.github/workflows/ci.yml', usesPnpm: true },
  { path: '.github/workflows/pages-preview.yml', usesPnpm: true },
  { path: '.github/workflows/security-dependency-audit.yml', usesPnpm: true },
  { path: '.github/workflows/quality-deep.yml', usesPnpm: true },
  { path: '.github/workflows/module-reachability-audit.yml', usesPnpm: true },
  { path: '.github/workflows/release.yml', usesPnpm: true },
  { path: '.github/workflows/release-draft.yml', usesPnpm: true },
  { path: '.github/workflows/v1.0.4-review-installers.yml', usesPnpm: true },
  { path: '.github/workflows/stable-readiness.yml', usesPnpm: false },
  { path: '.github/workflows/moonshine-native-matrix.yml', usesPnpm: true },
  { path: '.github/workflows/moonshine-candidate.yml', usesPnpm: true },
  { path: '.github/workflows/asr-candidate.yml', usesPnpm: true },
  { path: '.github/workflows/signed-candidate.yml', usesPnpm: true },
] as const;

export type ToolchainInputs = {
  manifest: string;
  lockfile: string;
  developmentGuide: string;
  workflows: Readonly<Record<string, string>>;
};

/**
 * Detect version drift; Dependabot and upstream release review determine when
 * a newer stable version is available. This check does NOT contact registries.
 * The pnpm 12 two-document lockfile stores its own pinned package integrity.
 */
export function checkToolchainConsistency(inputs: ToolchainInputs): string[] {
  const issues: string[] = [];
  let manifest: { packageManager?: unknown; devDependencies?: Record<string, unknown> };
  try {
    manifest = JSON.parse(inputs.manifest) as typeof manifest;
  } catch {
    return ['package.json: invalid JSON'];
  }
  const manager = typeof manifest.packageManager === 'string' ? manifest.packageManager : '';
  const pinned = /^pnpm@(\d+\.\d+\.\d+)(?:\+sha512\.[A-Za-z0-9+/=]+)?$/.exec(manager);
  if (!pinned) {
    issues.push('package.json: packageManager must pin one stable pnpm version');
  }
  const pnpmVersion = pinned?.[1];

  const nodeTypes = manifest.devDependencies?.['@types/node'];
  const nodeMajor = typeof nodeTypes === 'string'
    ? /^\^?(\d+)\./.exec(nodeTypes)?.[1]
    : undefined;
  if (!nodeMajor) {
    issues.push('package.json: @types/node must specify a stable major version');
  }

  const managerLock = /^ {4}packageManagerDependencies:\s*\r?\n {6}pnpm:\s*\r?\n {8}specifier:\s*['"]?(\d+\.\d+\.\d+)['"]?\s*\r?\n {8}version:\s*['"]?(\d+\.\d+\.\d+)['"]?\s*$/m.exec(inputs.lockfile);
  if (!managerLock || managerLock[1] !== pnpmVersion || managerLock[2] !== pnpmVersion) {
    issues.push('pnpm-lock.yaml: pinned pnpm specifier/version differ from package.json');
  }
  if (pnpmVersion) {
    const escaped = pnpmVersion.replace(/\./g, '\\.');
    const artifact = new RegExp('^  pnpm@' + escaped + ':\\r?\\n    resolution: \\{integrity: sha512-[A-Za-z0-9+/=]+\\}', 'm');
    if (!artifact.test(inputs.lockfile)) {
      issues.push('pnpm-lock.yaml: pinned pnpm artifact SHA-512 integrity is missing');
    }
  }

  for (const workflow of MAINTAINED_WORKFLOWS) {
    const source = inputs.workflows[workflow.path];
    if (source === undefined) {
      issues.push(workflow.path + ': maintained workflow file is missing');
      continue;
    }
    const nodeSteps = [...source.matchAll(/^\s*(?:-\s*)?uses:\s*actions\/setup-node@/gm)].length;
    const nodePins = [...source.matchAll(/^\s*node-version:\s*([^\r\n#]+)/gm)]
      .map(match => (match[1] ?? '').trim().replace(/^['"]|['"]$/g, ''));
    if (nodeSteps === 0 || nodeSteps !== nodePins.length || nodePins.some(value => value !== nodeMajor)) {
      issues.push(workflow.path + ': setup-node version(s) must match @types/node major');
    }

    const pnpmSteps = [...source.matchAll(/^\s*(?:-\s*)?uses:\s*pnpm\/action-setup@/gm)].length;
    const pnpmPins = [...source.matchAll(/^\s*version:\s*['"]?(\d+\.\d+\.\d+)['"]?\s*(?:#.*)?$/gm)]
      .map(match => match[1]);
    if (workflow.usesPnpm && (pnpmSteps === 0 || pnpmSteps !== pnpmPins.length || pnpmPins.some(value => value !== pnpmVersion))) {
      issues.push(workflow.path + ': pnpm/action-setup version(s) must match packageManager');
    } else if (!workflow.usesPnpm && pnpmSteps !== 0) {
      issues.push(workflow.path + ': newly added pnpm setup requires a maintained pin');
    }
  }

  const guideNode = /- Node\.js (\d+) \(Active LTS\)/.exec(inputs.developmentGuide)?.[1];
  if (!nodeMajor || guideNode !== nodeMajor) {
    issues.push('docs/DEVELOPMENT.md: documented Node Active LTS major differs from CI');
  }
  const posixPnpm = /PNPM_VERSION=(\d+\.\d+\.\d+)\s+sh\b/.exec(inputs.developmentGuide)?.[1];
  const windowsPnpm = /\$env:PNPM_VERSION\s*=\s*['"](\d+\.\d+\.\d+)['"]/.exec(inputs.developmentGuide)?.[1];
  if (!pnpmVersion || posixPnpm !== pnpmVersion || windowsPnpm !== pnpmVersion) {
    issues.push('docs/DEVELOPMENT.md: documented pnpm bootstrap differs from packageManager');
  }
  const forbidden = /(?:^|[;&|]\s*)\s*(?:run:\s*)?(?:npm\s+|npx\s+)/m;
  if (forbidden.test(inputs.developmentGuide)) issues.push('docs/DEVELOPMENT.md: use pnpm, not legacy package-manager CLI');
  for (const [filename, source] of Object.entries(inputs.workflows)) {
    if (forbidden.test(source)) issues.push(filename + ': use pnpm, not legacy package-manager CLI');
  }
  return issues;
}

const executedAsScript = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (executedAsScript) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const read = (relative: string): string => readFileSync(path.join(root, relative), 'utf8');
  const issues = checkToolchainConsistency({
    manifest: read('package.json'),
    lockfile: read('pnpm-lock.yaml'),
    developmentGuide: read('docs/DEVELOPMENT.md'),
    workflows: Object.fromEntries(MAINTAINED_WORKFLOWS.map(entry => [entry.path, read(entry.path)])),
  });
  if (issues.length > 0) {
    for (const issue of issues) console.error('- ' + issue);
    process.exitCode = 1;
  } else {
    console.log('Toolchain consistency check passed (' + MAINTAINED_WORKFLOWS.length + ' maintained workflows).');
  }
}
