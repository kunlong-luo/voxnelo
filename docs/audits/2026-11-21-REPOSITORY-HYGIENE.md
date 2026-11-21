# Voxnelo repository hygiene review — 2026-11-21

**Scope:** GitHub `main` commit `122080137b7dfe69d7581d6211f233588e8fb86a`, repository tree (419 entries, untruncated), tracked app/package sources, package scripts, maintained workflows, primary Markdown guides, publication metadata and selected historical release workflows. This is a bounded repository inventory **not** a compiler-level dead-code analysis of every symbol. No locally ignored files, private recordings, installed dependencies, all historical docs or real desktop devices were scanned.

## Confirmed stale content corrected in this PR

| File | Confirmed observation | Safe treatment |
| --- | --- | --- |
| `INSTALL-TO-LOCAL.md` | Instructions assumed an obsolete `voxnelo-desktop-starter-v0.1.zip`, a specific person's local source path, bundled Corepack and `pnpm@12.11.2`. The current package pins `pnpm@12.22.0` on Node 26 LTS. | Replace with generic Git checkout, frozen dependency install, current toolchain, tests and privacy safeguards. Keep the well-known root filename to avoid breaking existing links. |
| `README.md`, `README.zh-CN.md` | The landing pages described only 40 phrases, whereas `packages/content/sentences.ts` assembles 40 starter entries plus `EXPANDED_SENTENCES` (240 marked review-pending per the dated corpus audit). | Describe both cohorts and clearly label expansion drafts as unreviewed, not approved IPA/recordings. Do not change sentence IDs or learning state. |
| `docs/README.md`, `docs/release/DOCUMENT-INDEX.md` | Navigation and open-debt prose did not reflect the delivered PRD path matrix, local documentation checker, Node/pnpm guard and cross-platform guide. | Update links and distinguish completed code automation from incomplete real-device, linguistic and legal acceptance. |
| `docs/engineering/TECH-DEBT-2026-11-16.md` | An old snapshot still listed creating the Markdown command/link checker as future work despite the checker and tests existing and running in CI. | Mark automation implemented while preserving the original date, other debt and evidence boundaries. |
| `scripts/check-documentation.mts` | The maintained-document selection omitted the root installation guide, so its stale commands escaped required CI. | Include `INSTALL-TO-LOCAL.md` in the current Markdown check; avoid silently broadening CI to all historical docs. |

## Old code and files retained with a reason

| Candidate | Classification | Decision |
| --- | --- | --- |
| `scripts/prepare-asr-model.mts`, `scripts/stage-asr-pilot.mts`, `scripts/install-personal-asr.mts` and the `asr:*` npm commands | Older sherpa/Zipformer **opt-in engineering and migration utilities**; explicitly still reachable through root `package.json` scripts and may support personal offline data. | **Retain.** Do not remove by filename/age or migrate/delete user model directories. A later retirement requires source/import/test/CI and user migration evidence. |
| `scripts/u3-typography-probe.mts`, responsive/browser tests and `quality-deep.yml` | Active optional UI regression and typography stress infrastructure, not production UI assets. | **Retain.** Manual workflow is not a passing acceptance unless executed. |
| `scripts/benchmark-moonshine-voice.py`, `scripts/moonshine-stream-pilot.py` | Referenced by the Electron `extraResources` packaging contract. | **Retain.** Removing these breaks packaged native recognition and/or diagnostics. |
| `docs/Voxnelo-Product-Docs-v1.0/` original Markdown/DOCX/PDF/checksums | Frozen original PRD and source-of-truth provenance. | **Retain unchanged.** |
| `docs/release-notes/v0.*`, early V0.1 engineering reports and original UI screenshots | Historical release/UX evidence, some superseded by current guides. | **Retain as archive;** do not use as current setup or publication proof. |
| `.github/workflows/publish-*.yml` and `prepare-v0.1.7-draft-once.yml` | Version-specific publication history. Examined examples have `workflow_dispatch` but use `if: false` to disable jobs, with no automatic push trigger. | **Retain disabled historical evidence.** Do not rerun or bump dependencies as if maintained. |
| `.github/workflows/prepare-v1.0.4-private-draft-once.yml` and `repair-v1.0.4-private-draft-win-checksum-once.yml` | One-time Draft/change workflows still present in the tracked tree; the repair workflow has a manual dispatch and write privileges against a fixed Draft ID. | **Manual retirement review required** before deletion or disabling, including review of run history and draft checksum status. Do not invoke, refactor or retarget them in routine cleanup. |
| `perf:budget` and `perf:report` | Same report-only script via two exported package commands; the former is used by `quality-deep.yml`, while the latter may be an external/manual compatibility alias. | **Retain** pending caller audit; removal saves negligible code and risks breaking developer scripts. |
| `build/icon.png`, `build/offline-asr/README.md`, static SVGs, entitlement files | Native packaging identity, placeholder boundaries and signing inputs. | **Retain.** Build output `dist/`, `dist-electron/`, `release/`, `node_modules/`, generated worklet and local model directories are already excluded by `.gitignore`, not committed repository bloat. |

## Release and test facts verified

- GitHub public **latest** release: `v1.0.3`; `v1.0.4` and `v0.1.7` exist only as unpublished Draft releases at review time. No release or tag was created or modified by this audit.
- Current code identifies as version `1.0.4`, with React 19, TypeScript 6, Electron 45, Node 26 CI and pnpm 12.22.0. Source state is not a public release.
- `main` commit `1220801` was green on core CI, Pages and Linux/macOS/Windows package integrity before this work.
- This PR affects only documentation and the maintained Markdown checker; no production code, model files, historical product documents, release assets or private learning data are removed.

## Remaining follow-up (not declared done)

1. Perform a **cross-reference and test-based dead-code analysis** across Electron main/preload, renderer and all five workspace packages before removing any exported API, ASR bridge, migration tool or storage path. Import references alone do not prove safe deletion when runtime IPC/packaging loads files dynamically.
2. Audit disabled and one-shot release workflows with their run histories, permissions and private Draft checksum before separately retiring any potentially callable workflow. Prefer a focused PR and verify no release-creation path becomes newly active.
3. Maintain a protected archive index and revisit old technical debt after user-device tests, pronunciation/IPAs, licensing and actual WER/latency evidence. Do not use CI packaging as a substitute for human approval.

The status of files in this review is **confirmed stale content / used dependency / historical evidence / unverified retirement candidate**. No unverified file is labeled safe to delete.
