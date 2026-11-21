# Repository cleanup audit — 2026-11-21

Scope: `main` starting at `122080137b7dfe69d7581d6211f233588e8fb86a`, with GitHub's recursive tracked-file tree, current package scripts, release operations and workflow sources, test imports, documentation indexes, and the authenticated private v1.0.4 Draft asset inventory reviewed. This is a **bounded cleanup**, not a claim that a compiler/reference search established the absence of all dead TypeScript exports or unused assets.

## Confirmed removals or relocation

| Path | Finding and evidence | Decision |
| --- | --- | --- |
| `INSTALL-TO-LOCAL.md` | A root-level early starter ZIP extraction guide for `voxnelo-desktop-starter-v0.1.zip`, with a machine-specific `/home/spark/Projects/github/voxnelo/` path, an obsolete Corepack/pnpm 12.11.2 bootstrap, and a statement implying `pnpm-lock.yaml` was not included. The current repository already ships the lockfile and uses Node 26/pnpm 12.22.0. This is neither a user installer manual nor a safe current developer guide. | **Delete** from the current tree. Use [development](../DEVELOPMENT.md) and [user guide](../USER-GUIDE.md). Original text remains in Git history. |
| `.github/workflows/prepare-v1.0.4-private-draft-once.yml` | Version-specific one-off workflow with `contents: write` on a draft job and a `push` path trigger; GitHub already contains an unpublished v1.0.4 Draft (Release ID 428750217). Retaining it under active Actions makes re-triggering an old writer possible if the workflow path is edited. | **Move unmodified source** to [archive](../archive/workflows/prepare-v1.0.4-private-draft-once.yml); leave current generic draft workflow alone. |
| `.github/workflows/repair-v1.0.4-private-draft-win-checksum-once.yml` | Old draft-specific checksum/asset mutation workflow retains a manually dispatchable trigger and write permissions, using a fixed Draft ID and original SHA. No reason to allow a new run of the old mutating workflow as part of routine maintenance. | **Move unmodified source** to [archive](../archive/workflows/repair-v1.0.4-private-draft-win-checksum-once.yml) and retain assertions covering its original security gates and absence from executable Actions. |
| `tests/v1.0.4-draft-repair.test.ts` | Existing test read the live one-off workflow and expected a historical trigger as a current requirement. | Keep release-draft normalization checks and audited historical repair assertions, but load the archive and assert both live one-off workflow paths are absent. |
| `AGENTS.md`, `.github/PULL_REQUEST_TEMPLATE.md`, current release docs | Current candidate is 1.0.4 (unpublished), but agent introduction still called v0.1 Early Access the current code baseline; agent cross-reference used the wrong-cased `.github/pull_request_template.md` path. The old index still claimed no link/script check or complete traceability. | Fix terminology, case-sensitive file path, review checklist, status index and debt closure **without changing frozen PRD requirements**. |

## Reviewed and intentionally retained

- [Frozen product documentation](../Voxnelo-Product-Docs-v1.0/README.md), original PDFs/DOCX, checksum records, dated audits, historical release notes, release tags and GitHub Actions run history: provenance and/or release evidence, not disposable assets.
- Historical `publish-all-v*.yml` and `prepare-v0.1.7-draft-once.yml`: their entry jobs are already permanently disabled and regression tests explicitly reference the files. Do not delete without an audit of each test and release trail.
- `.github/workflows/release-draft.yml`, `v1.0.4-review-installers.yml`, `ci.yml` and cross-platform ASR / package / signed-candidate checks: still implement verification, or allow deliberate manual QA; the review-only workflow does not have publication permission.
- `build/icon.png`, `build/offline-asr/README.md`, `public/brand/*.svg`, content data, UI design references and platform script assets: visibly tied to packaging, UI, checks or historical provenance. Do not remove based only on filenames.
- `scripts/install-personal-asr.mts`, `scripts/prepare-asr-model.mts`, `scripts/stage-asr-*.mts` and offline ASR workers: still reachable from package scripts, native workers and/or verification. An older feature name is **not** proof of dead code.

## Additional work that still needs evidence

1. **Module-level unused exports/imports and CSS selectors:** run a full workspace import graph plus bundle/coverage-based inspection before deleting or refactoring TypeScript, React or CSS. This pass did not certify any runtime source file dead, so no live audio, IndexedDB, UI or ASR production logic was deleted.
2. **Historical workflow source cleanup (completed later 2026-11-21):** Seven disabled published-version and v0.1.7 Draft workflows were moved byte-for-byte from executable Actions to [the archive](../archive/README.md); original blob SHA-1 values, release regression tests, source/commit references and active-entry absence are checked. Existing GitHub releases, draft assets and run history were not modified.
3. **Documentation debt:** older dated audits intentionally describe their inspection date. Keep them as snapshots; maintain [current navigation](../release/DOCUMENT-INDEX.md) instead of rewriting historical findings. Continue checking external links and release asset identities independently.
4. **Actual release gates:** this cleanup does not establish human microphone, accessibility, content-rights, signing or language-review approvals, and does **not** publish a new release.

## Follow-up retirement — 2026-11-21

The seven remaining version-specific publisher/Draft workflow files have been relocated from `.github/workflows/` to `docs/archive/workflows/`. Their first jobs were already disabled, but keeping historical writer code in Actions exposed redundant manual dispatch entrypoints. The original file bytes and old publication assertions are retained, and new regression tests verify exact historical Git blob IDs plus absence of executable counterparts. This change neither runs nor republishes any release, and does not validate human/physical-device acceptance. Source-level dead-code analysis remains open: only the workflow entrypoint cleanup is certified.

## Validation boundary

Changes are limited to retiring obsolete one-off GitHub Actions entrypoints, keeping historical source snapshots, and refreshing guidance/tests. Required PR CI (TypeScript, lint, docs, tests, build and Windows/macOS/Linux package gates) must pass before merge; GitHub Actions passing is not an independent audit of prior release assets or real-device behavior.

## Source-reference follow-up — 2026-11-21

This follow-up was made against main `7518ac2f1ad974b0dd3dced1cfdb63f5fdc08ec5` before creating the dedicated cleanup branch.

- **CSS finding (confirmed, narrow scope):** both Nordic and Sunset theme declarations for `--surface-highlight` had no consumers in any of the 43 tracked TypeScript/TSX files under `apps/web/src/`. This was checked against the complete, untruncated GitHub tree. Neither declaration is used by another CSS rule; both were removed without changing named themes, `@theme inline`, animation keyframes or selectors. Build and UI checks must still pass before merge.
- **React retained (references confirmed):** `App.tsx` imports `PracticeView`; `PracticeView` imports `PracticeCard` and `PracticeSidebarWidgets`; `PracticeCard` uses `PracticeControlPanel`, `LiveDictationPanel` and `WaveformArt`; `PracticeControlPanel` uses `RecordingPlayback`; `Tooltip` is used by active controls. Do not retire them as "old components" based on names alone.
- **Animations retained (references confirmed):** `animate-panel-enter` in `SettingsView`/`PracticeSidebarWidgets`, `animate-success-glint` in `PracticeControlPanel`, and `animate-record-halo` in `LiveDictationPanel`. `--shadow-soft` and the sidebar scrollbar utility also have consumers.
- **Historical ASR retained (runtime contracts confirmed):** `scripts/build-electron.mts` bundles both `apps/desktop/offlineAsrWorker.ts` and `apps/desktop/moonshineAsrWorker.ts` as standalone entrypoints; `apps/desktop/main.ts` and `apps/desktop/preload.ts` expose legacy `zipformer` selection via protected IPC. Package scripts also expose opt-in older model staging. Static imports alone cannot safely justify worker, IPC, or user model-data removal.
- **Still unverified:** a complete TypeScript symbol/reference graph across tests and scripts, dynamically assembled Tailwind class names, packaged smoke behavior on real devices, and exhaustive unused CSS selectors. This audit is **not** certification that every unreferenced export or selector has been found.
