# Voxnelo repository governance setup

The repository is **public** (verified on GitHub, 2026-11-21). Ordinary dependency or CI work must not change its visibility; any future visibility change requires a separate maintainer decision.

## Manual GitHub settings (maintainer-only)

1. Settings → General → Pull Requests:
   - Enable **Allow squash merging** only.
   - Disable **Allow merge commits** and **Allow rebase merging**.
   - Enable **Allow auto-merge**.
   - Enable **Always suggest updating pull request branches**.
   - Keep **Automatically delete head branches** enabled.
2. Settings → Rules → Rulesets → New branch ruleset (if enabled for the current plan):
   - Name: `Protect main`; Enforcement: Active; target default branch.
   - Restrict deletions; block force pushes/non-fast-forward changes.
   - Require a pull request before merging and require resolution of review conversations.
   - Require status checks matching actual Voxnelo CI job contexts after they have run: `check`, `Desktop package integrity (windows-latest)`, `Desktop package integrity (macos-latest)`. Verify exact displayed check names before adding.
   - Require branches to be up to date before merging; prefer linear history.
   - Do not grant automated actors blanket bypass.
3. If GitHub rejects a rule due to a plan or permission restriction, record the exact restriction and use reviewed PRs as policy until eligible. Do not change repository visibility as a workaround.

## Automation and release

- `.github/CODEOWNERS` points to the repository maintainer for audio, desktop, storage, product baseline and GitHub workflows. Reassign owners only to accounts with repository access.
- `.github/workflows/ci.yml` is the authoritative pull-request validation workflow. Check statuses before merge.
- `.github/workflows/release.yml` builds *unsigned* OS-specific desktop candidates on tag/manual dispatch, with read-only token and no publishing credentials. Uploaded artifacts are **not** a public release, signed installer or completed QA.
- Run the F001–F012 acceptance matrix and desktop microphone checks before any external release; AI realtime chat remains outside v0.1.

## PR cost controls and branch protection — checked 2026-11-22

- The read-only TypeScript module reachability inventory runs on demand via Actions and on changes to its audit/build-entry definitions; it is not part of ordinary PR blocking checks. It saves a short-lived JSON report for human investigation and never removes files. Details: [module audit](../audits/2026-11-22-MODULE-REACHABILITY.md).
- The Moonshine-vs-Zipformer real-model comparison remains dispatchable and runs automatically on changes to its model/runtime scripts or ASR integrity logic. Generic `package.json` script edits or unrelated pnpm lockfile updates no longer start this expensive evaluation. Run it manually when accepting a new native inference candidate or preparing a relevant release.
- Dependency security audit still runs on the weekly schedule, manual dispatch, lockfile changes and Moonshine installer changes. The required frozen-lockfile and toolchain CI checks reject dependency/manifest drift; script-only changes should not reinstall the full Python SDK unnecessarily.
- All three heavy ASR/security workflows use PR-keyed concurrency with `cancel-in-progress: true` so a later push supersedes the prior run for the same PR; manual and scheduled invocations remain available.
- **Linux merge protection without a Ruleset edit:** the active [Protect main ruleset](https://github.com/kunlong-luo/voxnelo/rules/25222193) still directly requires the `check`, Windows and macOS contexts, but **not Linux**. The `.github/workflows/ci.yml` workflow now runs `quality` (typecheck/lint/tests/build) and the full three-platform `desktop-package` matrix in parallel, followed by the existing required **`check` aggregate gate**. It has `needs: [quality, desktop-package]`, runs even if a dependency fails, and only succeeds when **both aggregated results equal `success`**. Every matrix leg, including Linux, must pass before this required context can succeed. No additional slow test run is introduced; the final gate is just a status check.
- **Optional direct Ruleset improvement:** an administrator may still add `Desktop package integrity (ubuntu-latest)` in Settings → Rules → Rulesets → Protect main → Require status checks. This makes Linux independently visible but is not required for the effective aggregate gate above. **This code change does not edit GitHub's live Ruleset.** The linked [Issue #244](https://github.com/kunlong-luo/voxnelo/issues/244) records the direct-settings option.

## Important

GitHub settings cannot be enforced merely by committing this document. A maintainer must verify the settings are enabled. Never assume pending GitHub checks have passed.
