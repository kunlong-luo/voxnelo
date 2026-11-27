import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type DocumentationIssue = {
  file: string;
  kind: 'missing-file' | 'outside-repo' | 'unknown-script' | 'invalid-link' | 'task-contract';
  detail: string;
};

export const CURRENT_DOCUMENTS = [
  'README.md',
  'README.zh-CN.md',
  'CHANGELOG.md',
  'SECURITY.md',
  'docs/README.md',
  'docs/DEVELOPMENT.md',
  'docs/design/V3-DICTATION-FIRST-UX-2026-11-23.md',
  'docs/design/V3-VISUAL-PRODUCTION-SPEC.md',
  'docs/engineering/UI-ACCESSIBILITY-AUDIT-2026-11-16.md',
  'docs/USER-GUIDE.md',
  'docs/PRIVACY.md',
  'docs/release-notes/v1.0.4.md',
  'docs/release/PRD-TRACEABILITY.md',
  'docs/release/V1.0.4-PHYSICAL-DEVICE-EVIDENCE.md',
  'docs/release/DOCUMENT-INDEX.md',
  'docs/release/V1.0.4-RELEASE-FREEZE.md',
  'docs/release/V1.0.4-REGISTRY-AUDIT.md',
  'docs/release/V1.0.4-REVIEW-ARTIFACT-HANDOFF-2026-11-24.md',
  'docs/release/ASR-BENCHMARK-PROTOCOL.md',
  'docs/audits/2026-11-22-MODULE-REACHABILITY.md',
  'docs/engineering/RELEASE-OPERATIONS.md',
  'docs/engineering/BUILD-LICENSE-INVENTORY.md',
  'docs/engineering/LOCAL-ASR-PERSONAL-PILOT.md',
  'build/offline-asr/README.md',
  'docs/engineering/ASR-PUBLIC-RELEASE-GATE.md',
  'docs/engineering/MOONSHINE-PRIVATE-LICENSE-TEXT-REVIEW-2026-11-24.md',
  'docs/engineering/MOONSHINE-VERSION-MIGRATION-DECISION-2026-11-24.md',
  'docs/engineering/MOONSHINE-V1.0.4-LICENSE-EVIDENCE.md',
  'docs/engineering/MOONSHINE-V1.0.4-PROVENANCE-AND-NOTICES-2026-11-23.md',
  'docs/engineering/MOONSHINE-UPSTREAM-EVIDENCE-REQUEST-2026-11-23.md',
  'docs/engineering/TECH-DEBT-2026-11-16.md',
  'docs/engineering/V0.1-CONTENT-REVIEW.md',
  'docs/engineering/REPOSITORY-GOVERNANCE.md',
  'docs/engineering/NODE26-LTS-MIGRATION.md',
  'docs/engineering/CONNECTED-SPEECH-AUDIO-REVIEW.md',
  'AGENTS.md',
  '.github/PULL_REQUEST_TEMPLATE.md',
  'docs/deployment/GITHUB-PAGES-WEB-PREVIEW.md',
  'docs/engineering/MOONSHINE-LINUX-INSTALLATION.md',
  'docs/engineering/MOONSHINE-CROSS-PLATFORM-PILOT.md',
  'docs/engineering/MOONSHINE-DEPENDENCY-EVIDENCE-2026-11-22.md',
  'docs/engineering/GITHUB-RELEASE-DRAFT.md',
  'docs/engineering/STABLE-RELEASE-READINESS.md',
  'docs/engineering/SIGNED-CANDIDATE-SETUP.md',
  'docs/support/POP-OS-24-ENGLISH-TTS.md',
  'docs/release/UNSIGNED-V1-OWNER-DECISION.md',
  'docs/release-notes/v1.0.3.md',
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
        // Skip dependency/VCS directories at any depth, but build output
        // names only at the repository root. docs/release is tracked evidence.
        if (entry.name === '.git' || entry.name === 'node_modules') continue;
        if (!relative && ['dist', 'dist-electron', 'release', 'coverage'].includes(entry.name)) continue;
        visit(path.join(relative, entry.name));
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push(path.join(relative, entry.name).split(path.sep).join('/'));
      }
    }
  }
  visit('');
  return results.sort();
}


export function auditAgentContract(
  form: string, agents: string, governance: string, pr: string,
): DocumentationIssue[] {
  const issues: DocumentationIssue[] = [];
  const requireText = (file: string, source: string, token: string): void => {
    if (!source.includes(token)) issues.push({ file, kind: 'task-contract', detail: 'missing ' + token });
  };
  const formPath = '.github/ISSUE_TEMPLATE/agent_task.yml';
  const blocks = form.split(/^ {2}- type: /m).slice(1);
  for (const id of ['goal', 'priority', 'dependencies', 'scope', 'acceptance', 'verification', 'handoff']) {
    const matches = blocks.filter(block => block.split('\n').includes('    id: ' + id));
    if (matches.length !== 1 || !matches[0]?.includes('      required: true')) {
      issues.push({ file: formPath, kind: 'task-contract', detail: 'expected one required field: ' + id });
    }
  }
  const priority = blocks.find(block => block.split('\n').includes('    id: priority')) ?? '';
  const options = [...priority.matchAll(/^ {8}- (.+)$/gm)].map(match => match[1]);
  if (options.join(',') !== 'P0,P1,P2,P3') {
    issues.push({ file: formPath, kind: 'task-contract', detail: 'priority options must be P0,P1,P2,P3' });
  }
  requireText('AGENTS.md', agents, '## 2. 独立会话启动');
  requireText('AGENTS.md', agents, '## 6. 独立会话关闭');
  requireText('docs/engineering/REPOSITORY-GOVERNANCE.md', governance, '### Definition of Done');
  requireText('docs/engineering/REPOSITORY-GOVERNANCE.md', governance, '### Fresh-session acceptance');
  for (const field of ['关联 Issue', '基线 SHA', '文档同步', '验收证据', '回滚方式', '剩余工作与下一步']) {
    requireText('.github/PULL_REQUEST_TEMPLATE.md', pr, '- ' + field + '：');
  }
  requireText('.github/PULL_REQUEST_TEMPLATE.md', pr, '<!-- voxnelo-agent-task -->');
  return issues;
}

export function auditAgentPullRequest(body: string): DocumentationIssue[] {
  if (!body.includes('<!-- voxnelo-agent-task -->')) return [];
  const issues: DocumentationIssue[] = [];
  const fields = new Map<string, string[]>();
  for (const line of body.split(/\r?\n/)) {
    const match = /^- ([^：]+)：(.*)$/.exec(line);
    if (match?.[1] && match[2] !== undefined) {
      fields.set(match[1], [...(fields.get(match[1]) ?? []), match[2].trim()]);
    }
  }
  for (const field of ['关联 Issue', '基线 SHA', '文档同步', '验收证据', '回滚方式', '剩余工作与下一步']) {
    const values = fields.get(field) ?? [];
    const value = values[0] ?? '';
    const valid = values.length === 1 && value.length > 0 && !value.startsWith('（')
      && (field !== '关联 Issue' || /^#[1-9]\d*$/.test(value))
      && (field !== '基线 SHA' || /^[a-f0-9]{40}$/.test(value));
    if (!valid) issues.push({ file: 'PR body', kind: 'task-contract', detail: 'missing or invalid ' + field });
  }
  return issues;
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
  if (!includeHistorical) {
    const read = (file: string): string => existsSync(path.join(root, file))
      ? readFileSync(path.join(root, file), 'utf8') : '';
    issues.push(...auditAgentContract(
      read('.github/ISSUE_TEMPLATE/agent_task.yml'),
      read('AGENTS.md'),
      read('docs/engineering/REPOSITORY-GOVERNANCE.md'),
      read('.github/PULL_REQUEST_TEMPLATE.md'),
    ));
  }
  return issues;
}

const executedAsScript = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (executedAsScript) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const all = process.argv.includes('--all');
  const issues = checkDocumentation(root, all);
  // The Actions event is data, never interpolated into a shell command.
  if (process.env.GITHUB_EVENT_NAME === 'pull_request' && process.env.GITHUB_EVENT_PATH) {
    const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')) as {
      pull_request?: { body?: string | null };
    };
    issues.push(...auditAgentPullRequest(event.pull_request?.body ?? ''));
  }
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
