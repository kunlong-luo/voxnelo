# Module reachability audit — 2026-11-22

This is a **read-only candidate inventory**, not a command that deletes old code or proves that a source file is unused. It does not change any bundled application, Electron IPC, learning data, installed native SDK, model, release or workflow.

## Run on demand

From a clean, dependency-installed repository:

```bash
pnpm audit:modules
pnpm audit:modules -- --json
```

The audit uses the repository's already-installed `typescript` dependency and `tsconfig.json`; no new package or network call is required. The first command prints a short inventory and `REVIEW` paths. The second prints machine-readable evidence. Candidate paths are **not authorized for deletion**.

## On-demand CI report (no extra checks on ordinary PRs)

Use GitHub Actions → **Read-only TypeScript module reachability inventory** → **Run workflow** to execute the scan against a chosen branch. The workflow also triggers when its own definition, source audit, TypeScript configuration or the three build-entry declarations change, **not** for unrelated PRs. It installs only the existing pinned Node/pnpm/TypeScript toolchain, prints a summary in the Actions run, and saves `module-reachability-report.json` as a seven-day Actions artifact. All permissions are read-only; no production source, model, user data, release or branch is modified. The audit report lists candidates for review; a candidate is not authorized for deletion.

## Entrypoint coverage

The script extracts literal source entrypoints from `rsbuild.config.ts`, `scripts/build-electron.mts` and `scripts/build-audio-worklet.mts`. It explicitly checks for the current seven entries: renderer, Electron main/preload, both dedicated ASR Workers, the native Moonshine installer and the standalone PCM AudioWorklet. It fails closed if one of these known build roots disappears from the scanned build definitions or `tsconfig`.

It parses static imports, re-exports, `import type`, literal `import()` and literal CommonJS `require()` using the TypeScript parser, then resolves local imports through TypeScript's module resolution (including workspace aliases). Type-only imports are counted conservatively as references; this may overstate runtime reachability.

It splits the tracked app/package source modules into: reachable from bundle entrypoints, tooling-only, test-only, and unreferenced **review candidates**. Every `scripts/*.mts` is treated as an independent tooling entrypoint, whether or not exposed as an npm script, to protect manually invoked diagnostics and historical ASR migration utilities. Tests are separate roots and are not treated as proof of production use.

## What it cannot establish

- Non-literal dynamic `import()`, `require()` and `import.meta.glob` are flagged for investigation; their potential targets cannot be proven from this graph.
- Electron IPC channel names, worker paths constructed with `path.join`, Python subprocess code, native addons and packaged `extraResources` require additional manual review. Explicit bundler roots protect known Workers but do not automatically cover future entries not registered in build definitions.
- CSS and Tailwind dynamic classes, component visibility in real windows, `new URL()` assets, reflection, external deep imports, platform-specific branches, private user models and runtime storage are outside the TypeScript dependency graph.
- This is **module-level** reachability, not compiler language-service unused-symbol/export proof, and a module reachable only from a test is not necessarily safe to delete.

Before removing a reported candidate, inspect package exports, CLI/workflow references, dynamic/IPC/package entrypoints, tests and per-platform installer resources; write the evidence in the repository cleanup audit, make the smallest reversible change, and require real CI validation. Do not turn the inventory into an automated deletion gate. No human microphone, linguistic, accessibility, licensing or publication approval is implied.

See [repository cleanup audit](2026-11-21-REPOSITORY-CLEANUP.md) and [technical debt](../engineering/TECH-DEBT-2026-11-16.md).
