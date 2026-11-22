import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

/**
 * Report-only TypeScript source reachability audit. An unused module candidate
 * is NOT proof that it is safe to remove: IPC strings, packaging resources,
 * externally loaded addons, CSS, reflection and dynamic paths need review.
 */
export interface ImportScan {
  specifiers: string[];
  nonLiteralImports: boolean;
}

export function scanModuleSpecifiers(source: string, filename = 'example.ts'): ImportScan {
  const sf = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true,
    filename.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const specifiers = new Set<string>();
  let nonLiteralImports = false;
  const record = (expression: ts.Expression | undefined): void => {
    if (expression && ts.isStringLiteralLike(expression)) specifiers.add(expression.text);
    else nonLiteralImports = true;
  };
  const visit = (node: ts.Node): void => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      record(node.moduleSpecifier);
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      record(node.moduleReference.expression);
    } else if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) && node.expression.text === 'require')) {
        record(node.arguments[0]);
      } else if (ts.isPropertyAccessExpression(node.expression) &&
                 node.expression.name.text === 'glob' &&
                 node.expression.expression.getText(sf) === 'import.meta') {
        nonLiteralImports = true;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return { specifiers: [...specifiers].sort(), nonLiteralImports };
}

/** Follow transitive edges, including cycles, without treating unrooted modules as reachable. */
export function traceModules(roots: readonly string[], graph: ReadonlyMap<string, readonly string[]>): Set<string> {
  const reached = new Set<string>();
  const queue = [...roots];
  while (queue.length > 0) {
    const current = queue.pop();
    if (!current || reached.has(current)) continue;
    reached.add(current);
    for (const next of graph.get(current) ?? []) if (!reached.has(next)) queue.push(next);
  }
  return reached;
}

/** These are actual source paths passed to Rsbuild/esbuild, not imported TS symbols. */
export function discoverBundledEntrypoints(configSources: Readonly<Record<string, string>>): string[] {
  const entries = new Set<string>();
  for (const [filename, code] of Object.entries(configSources)) {
    const sf = ts.createSourceFile(filename, code, ts.ScriptTarget.Latest, true);
    const visit = (node: ts.Node): void => {
      if (ts.isStringLiteralLike(node)) {
        const value = node.text.replace(/^\.\//, '');
        if (/^(?:apps|scripts)\/[\w/.-]+\.(?:ts|tsx|mts)$/.test(value)) entries.add(value);
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return [...entries].sort();
}

const REQUIRED_ENTRIES = [
  'apps/desktop/main.ts',
  'apps/desktop/preload.ts',
  'apps/desktop/offlineAsrWorker.ts',
  'apps/desktop/moonshineAsrWorker.ts',
  'apps/web/src/main.tsx',
  'apps/web/src/audio/pcm-worklet.ts',
  'scripts/install-moonshine-linux.mts',
] as const;
const BUILD_CONFIGS = ['rsbuild.config.ts', 'scripts/build-electron.mts', 'scripts/build-audio-worklet.mts'] as const;

export interface ModuleAuditReport {
  productionEntrypoints: string[];
  sourceModuleCount: number;
  productionReachable: number;
  toolingOnly: string[];
  testsOnly: string[];
  /** TypeScript declarations are compiled for typechecking, not bundled as runtime modules. */
  declarationFiles: string[];
  reviewCandidates: string[];
  nonLiteralImportSources: string[];
  unresolvedRelativeImports: string[];
}

export function auditModuleReachability(root: string): ModuleAuditReport {
  const absoluteRoot = path.resolve(root);
  const configPath = path.join(absoluteRoot, 'tsconfig.json');
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'));
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, absoluteRoot);
  if (parsed.errors.length > 0) throw new Error(parsed.errors.map(e => ts.flattenDiagnosticMessageText(e.messageText, '\n')).join('\n'));

  const entryConfig = Object.fromEntries(BUILD_CONFIGS.map(file => [file, readFileSync(path.join(absoluteRoot, file), 'utf8')]));
  const bundled = discoverBundledEntrypoints(entryConfig);
  const missing = REQUIRED_ENTRIES.filter(file => !bundled.includes(file));
  if (missing.length) throw new Error('Bundle entrypoint inventory changed; review before auditing: ' + missing.join(', '));

  const all = new Set(parsed.fileNames.map(file => path.resolve(file)));
  const internalSources = [...all].filter(file => /^(?:apps|packages)\//.test(path.relative(absoluteRoot, file).replaceAll('\\', '/')));
  // Ambient declarations can be essential to typecheck CSS imports without
  // having an import edge to them. Never classify *.d.ts as dead runtime code.
  const declarationFiles = internalSources.filter(file => /\.d\.(?:ts|mts|cts)$/.test(file));
  const runtimeSources = internalSources.filter(file => !/\.d\.(?:ts|mts|cts)$/.test(file));
  const productionEntrypoints = bundled.map(file => path.resolve(absoluteRoot, file));
  const invalid = productionEntrypoints.filter(file => !all.has(file));
  if (invalid.length) throw new Error('Bundle entries absent from tsconfig: ' + invalid.join(', '));

  const edges = new Map<string, string[]>();
  const nonLiteral = new Set<string>();
  const unresolved = new Set<string>();
  for (const file of all) {
    const scan = scanModuleSpecifiers(readFileSync(file, 'utf8'), file);
    if (scan.nonLiteralImports) nonLiteral.add(file);
    const dependencies = new Set<string>();
    for (const specifier of scan.specifiers) {
      const resolved = ts.resolveModuleName(specifier, file, parsed.options, ts.sys).resolvedModule?.resolvedFileName;
      if (resolved && all.has(path.resolve(resolved))) dependencies.add(path.resolve(resolved));
      else if (!resolved && specifier.startsWith('.') && /\.(?:[cm]?ts|tsx|[cm]?js|jsx)$/.test(specifier)) {
        unresolved.add(path.relative(absoluteRoot, file).replaceAll('\\', '/') + ' -> ' + specifier);
      }
    }
    edges.set(file, [...dependencies]);
  }

  const toolingRoots = [...all].filter(file => /^(?:scripts\/.*\.mts|(?:rsbuild|eslint|vitest)\.config\.(?:ts|mts))$/.test(path.relative(absoluteRoot, file).replaceAll('\\', '/')));
  const testRoots = [...all].filter(file => /^tests\//.test(path.relative(absoluteRoot, file).replaceAll('\\', '/')));
  const runtime = traceModules(productionEntrypoints, edges);
  const tools = traceModules([...productionEntrypoints, ...toolingRoots], edges);
  const every = traceModules([...productionEntrypoints, ...toolingRoots, ...testRoots], edges);
  const relative = (file: string) => path.relative(absoluteRoot, file).replaceAll('\\', '/');
  const sorted = (files: string[]) => files.map(relative).sort();
  return {
    productionEntrypoints: bundled,
    sourceModuleCount: internalSources.length,
    productionReachable: runtimeSources.filter(file => runtime.has(file)).length,
    toolingOnly: sorted(runtimeSources.filter(file => !runtime.has(file) && tools.has(file))),
    testsOnly: sorted(runtimeSources.filter(file => !tools.has(file) && every.has(file))),
    declarationFiles: sorted(declarationFiles),
    reviewCandidates: sorted(runtimeSources.filter(file => !every.has(file))),
    nonLiteralImportSources: sorted([...nonLiteral].filter(file => every.has(file))),
    unresolvedRelativeImports: [...unresolved].sort(),
  };
}

const calledDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (calledDirectly) {
  try {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const report = auditModuleReachability(root);
    if (process.argv.includes('--json')) {
      process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    } else {
      console.log('Module reachability (review only; never auto-delete):');
      console.log(report.productionReachable + '/' + report.sourceModuleCount + ' app/package modules reachable from ' + report.productionEntrypoints.length + ' bundle entrypoints.');
      console.log(report.toolingOnly.length + ' tooling-only; ' + report.testsOnly.length + ' test-only; ' + report.declarationFiles.length + ' type-declaration-only; ' + report.reviewCandidates.length + ' unreferenced runtime review candidate(s).');
      for (const file of report.reviewCandidates) console.log('  REVIEW ' + file);
      if (report.nonLiteralImportSources.length) console.log('Nonliteral import/require/glob requires manual review in: ' + report.nonLiteralImportSources.join(', '));
      if (report.unresolvedRelativeImports.length) console.log('Unresolved relative source imports (manual review): ' + report.unresolvedRelativeImports.join(', '));
      console.log('This is not proof of dead code: IPC, packaging resources, reflection, CSS and user data remain outside this graph.');
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
