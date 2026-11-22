import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type DocumentationIssue = {
  file: string;
  kind: 'missing-file' | 'outside-repo' | 'unknown-script' | 'invalid-link';
  detail: string;
};

export const CURRENT_DOCUMENTS = [
  'README.md',
  'README.zh-CN.md',
  'CHANGELOG.md',
  'SECURITY.md',
  'docs/README.md',
  'docs/DEVELOPMENT.md',
  'docs/USER-GUIDE.md',
  'docs/PRIVACY.md',
  'docs/release-notes/v1.0.4.md',
  'docs/release/PRD-TRACEABILITY.md',
  'docs/release/DOCUMENT-INDEX.md',
  'docs/release/ASR-BENCHMARK-PROTOCOL.md',
  'docs/audits/2026-11-22-MODULE-REACHABILITY.md',
  'docs/engineering/RELEASE-OPERATIONS.md',
  'docs/engineering/ASR-PUBLIC-RELEASE-GATE.md',
  'docs/engineering/TECH-DEBT-2026-11-16.md',
  'docs/engineering/V0.1-CONTENT-REVIEW.md',
  'docs/engineering/REPOSITORY-GOVERNANCE.md',
  'docs/engineering/NODE26-LTS-MIGRATION.md',
  'docs/engineering/CONNECTED-SPEECH-AUDIO-REVIEW.md',
] as const;

const BUILTIN_PNPM_COMMANDS = new Set([
  'install', 'i', 'add', 'remove', 'rm', 'update', 'up', 'exec', 'dlx',
  'list', 'ls', 'why', 'audit', 'outdated', 'store', 'fetch', 'approve-builds',
  'config', 'help', 'init', 'import', 'publish', 'pack', 'view', 'version',
  'prune', 'rebuild', 'link', 'unlink', 'deploy', 'create', 'setup', 'env',
]);

function withoutFencedCode(markdown: string): string {
  let fence: { character: string; length: number } | undefined;
  return markdown.split('\n').map((line) => {
    const delimiter = /^\s{0,3}(\x60{3,}|~{3,})/.exec(line);
    if (delimiter?.[1]) {
      const marker = delimiter[1];
      if (!fence) {
        fence = { character: marker[0] ?? '', length: marker.length };
      } else if (marker[0] === fence.character && marker.length >= fence.length) {
        fence = undefined;
      }
      return '';
    }
    return fence ? '' : line;
  }).join('\n');
}

export function localMarkdownLinks(markdown: string): string[] {
  const result: string[] = [];
  const plain = withoutFencedCode(markdown);
  const pattern = /!?\[[^\]\n]*\]\(\s*(<[^>\n]+>|[^\s)\n]+)(?:\s+[^)\n]*)?\)/g;
  for (const match of plain.matchAll(pattern)) {
    const target = match[1]?.replace(/^<|>$/g, '');
    if (target) result.push(target);
  }
  const referenceDefinitions = /^\s{0,3}\[[^\]\n]+\]:\s*(<[^>\n]+>|[^\s\n]+)/gm;
  for (const match of plain.matchAll(referenceDefinitions)) {
    const target = match[1]?.replace(/^<|>$/g, '');
    if (target) result.push(target);
  }
  return result;
}

export function documentedPnpmCommands(markdown: string): string[] {
  const commands: string[] = [];
  // Only shell-like command lines and inline code are commands. Ordinary prose,
  // such as "pnpm script names", must not be mistaken for an invocation.
  const command = /(?:corepack\s+)?pnpm\s+(?:(?:--[a-z][\w-]*)(?:=[^\s]+)?\s+)*(?:run\s+)?([a-z][\w:-]*)/;
  for (const line of markdown.split('\n')) {
    if (!/^\s*(?:[-*]\s+)?(?:\$\s*)?(?:corepack\s+)?pnpm\s+/.test(line)) continue;
    // An ordinary Markdown bullet such as "- pnpm was updated" is prose, not a CLI invocation.
    // Keep checking actual bullet commands (including misspelled scripts).
    if (/^\s*[-*]\s+pnpm\s+(?:is|was|were|are|has|had|will|would|should|can|could|may|might)\b/i.test(line)) continue;
    const match = command.exec(line);
    if (match?.[1]) commands.push(match[1]);
  }
  for (const inline of markdown.matchAll(/\x60+([^\x60\n]+)\x60+/g)) {
    const code = inline[1] ?? '';
    const match = command.exec(code);
    if (match?.[1]) commands.push(match[1]);
  }
  return commands;
}

export function auditMarkdown(
  root: string,
  filename: string,
  markdown: string,
  packageScripts: ReadonlySet<string>,
): DocumentationIssue[] {
  const issues: DocumentationIssue[] = [];
  const base = path.resolve(root);
  const documentDirectory = path.dirname(path.resolve(base, filename));

  for (const target of localMarkdownLinks(markdown)) {
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(target)) continue;
    let localPath: string;
    try {
      const clean = decodeURIComponent(target.split(/[?#]/, 1)[0] ?? '');
      if (!clean) continue;
      localPath = path.resolve(documentDirectory, clean);
    } catch {
      issues.push({ file: filename, kind: 'invalid-link', detail: target });
      continue;
    }
    if (localPath !== base && !localPath.startsWith(base + path.sep)) {
      issues.push({ file: filename, kind: 'outside-repo', detail: target });
    } else if (!existsSync(localPath)) {
      issues.push({ file: filename, kind: 'missing-file', detail: target });
    }
  }

  for (const command of documentedPnpmCommands(markdown)) {
    if (!packageScripts.has(command) && !BUILTIN_PNPM_COMMANDS.has(command)) {
      issues.push({ file: filename, kind: 'unknown-script', detail: 'pnpm ' + command });
    }
  }
  return issues;
}

function allMarkdownFiles(root: string): string[] {
  const results: string[] = [];
  function visit(relative: string): void {
    const directory = path.join(root, relative);
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (!['.git', 'node_modules', 'dist', 'release'].includes(entry.name)) {
          visit(path.join(relative, entry.name));
        }
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push(path.join(relative, entry.name).split(path.sep).join('/'));
      }
    }
  }
  visit('');
  return results.sort();
}

export function checkDocumentation(root: string, includeHistorical = false): DocumentationIssue[] {
  const scripts = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')) as {
    scripts?: Record<string, string>;
  };
  const known = new Set(Object.keys(scripts.scripts ?? {}));
  const files = includeHistorical ? allMarkdownFiles(root) : [...CURRENT_DOCUMENTS];
  const issues: DocumentationIssue[] = [];
  for (const file of files) {
    const fullPath = path.join(root, file);
    if (!existsSync(fullPath)) {
      issues.push({ file, kind: 'missing-file', detail: 'document not found' });
      continue;
    }
    issues.push(...auditMarkdown(root, file, readFileSync(fullPath, 'utf8'), known));
  }
  return issues;
}

const executedAsScript = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (executedAsScript) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const all = process.argv.includes('--all');
  const issues = checkDocumentation(root, all);
  for (const issue of issues) {
    console.error(issue.file + ': ' + issue.kind + ': ' + issue.detail);
  }
  if (issues.length) {
    console.error('Documentation check failed: ' + issues.length + ' issue(s).');
    process.exitCode = 1;
  } else {
    console.log('Documentation check passed (' + (all ? 'all Markdown files' : 'maintained docs') + ').');
  }
}
