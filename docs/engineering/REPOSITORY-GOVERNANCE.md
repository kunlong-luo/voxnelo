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


## GitHub Actions direct dependency pinning — 2026-11-25

Reviewed all 14 live workflow files at source `a4f1e4faec9bff23e14b2a64b35e701a64ea6afd`. Found 26 direct external uses entries in 13 files referring to mutable major-version tags. Resolved each of the five tags through its official GitHub repository refs API to a commit object (not a tag object). Proposed replacement uses the exact 40-character commit, retaining the previous major version as a comment:

| Action / prior tag | Resolved official commit |
| --- | --- |
| actions/upload-artifact@v7 | [cf430e030ddbb5b0abf93d22962f4752f3646cd9](https://github.com/actions/upload-artifact/commit/cf430e030ddbb5b0abf93d22962f4752f3646cd9) |
| actions/download-artifact@v8 | [9000827ccba6bdab643e8b6fd33ac0654aef8333](https://github.com/actions/download-artifact/commit/9000827ccba6bdab643e8b6fd33ac0654aef8333) |
| actions/configure-pages@v6 | [45bfe0192ca1faeb007ade9deae92b16b8254a0d](https://github.com/actions/configure-pages/commit/45bfe0192ca1faeb007ade9deae92b16b8254a0d) |
| actions/upload-pages-artifact@v5 | [fc324d3547104276b827a68afc52ff2a11cc49c9](https://github.com/actions/upload-pages-artifact/commit/fc324d3547104276b827a68afc52ff2a11cc49c9) |
| actions/deploy-pages@v5 | [368f82528645a54fb793d4d04e342629a3f51346](https://github.com/actions/deploy-pages/commit/368f82528645a54fb793d4d04e342629a3f51346) |

The other direct external entries already used full commit hashes; local reusable workflows remain local. Reviewed actual upload-pages-artifact action.yml at the pinned commit: its nested upload-artifact reference is itself pinned (bbbca2ddaa5d8feaa63e36b76fdaad77386f024f, v7.0.0). This is not an exhaustive transitive action/runner/download audit or a claim that pinned code is vulnerability-free. The regression scans direct uses entries in the active YAML files using the repository's current block-style convention, not a full YAML parser. Archived historical workflows are intentionally unchanged. No triggers, token permissions, build commands, release flags, dependencies or production runtime changed; existing scoped workflow triggers may run the relevant security/native checks because their own files changed. Manual release writers remain manual only. Do not rebuild or publish the selected installer solely because of this change.


Maintenance: review upstream release/commit changes explicitly before updating pins, record the new exact SHA and run applicable CI. Do not change live GitHub Rulesets or Actions policy implicitly; no settings mutation was performed. Historical archive byte-identity checks remain intact.


## Independent Agent task protocol / 独立会话任务协议

Use [AGENTS.md](../../AGENTS.md) for startup/closure and the [Agent task form](../../.github/ISSUE_TEMPLATE/agent_task.yml) for new independently deliverable work. GitHub Issues own task priority, dependencies, acceptance and progress; PRs own implementation and review evidence. The [PRD matrix](../release/PRD-TRACEABILITY.md) owns product coverage; the [release freeze](../release/V1.0.4-RELEASE-FREEZE.md) alone owns current release gates. Do not duplicate any of these in a new ledger. Engineering task priority is distinct from historical PRD priorities.

### Priority and dependencies

| Priority | Meaning |
| --- | --- |
| P0 | Current security, data-loss, core-flow regression or authorized release-blocking incident. |
| P1 | High-value engineering or product work; required readiness work, without implying release approval. |
| P2 | Planned quality, usability or maintainability improvement. |
| P3 | Optional or deferred enhancement. |

Select exactly one priority. Express hard dependencies as same-repository Issue references (one per line) or an explicit external evidence/decision with owner and next action; use 无 when none. Related work is not a hard dependency. No self-dependency or cycles; check upstream evidence, not only closed state. If blocked, do not start dependent implementation or close it; record the unmet condition in the owning Issue. Work eligible for execution is ordered by priority, then dependency order, then oldest ready Issue; a maintainer can explicitly override sequencing, not safety/release gates.

Existing Issues retain their original history; add priority/dependency metadata to the owning Issue when triaging, not a parallel task list. Existing Bug/Feature forms remain intake forms; convert actionable scoped work to the Agent format in the same Issue rather than opening a duplicate.

### Definition of Done

- Scope, target version/PRD ID (or no feature change), priority and dependencies are explicit; acceptance criteria are observable and satisfied.
- Implementation and relevant positive/negative tests are committed; applicable commands and actual results are recorded. Existing required CI and review gates pass for the exact PR head; unexecuted/manual checks are identified.
- Update affected maintained documentation (PRD mapping, guides, ADR, or release evidence only when applicable); record exact files or an explicit no-change rationale in the PR. Frozen source documents and private evidence are not overwritten.
- Record known risks, rollback path, actual validation evidence and remaining work; link the Issue and PR. Confirm squash merge SHA and branch cleanup; keep an Issue open when any criterion remains unmet, including external evidence.
- A merged engineering task never authorizes publication. v1.0.4 remains HOLD until its independent release freeze criteria and maintainer decision are satisfied.

### Fresh-session acceptance

Choose one small unblocked Issue after the protocol is available on main. Start a separate Agent session with no conversation history; give it only the repository URL and Issue number. It must discover AGENTS.md and the linked authorities, record main SHA, restate scope/priority/dependencies/acceptance, perform the task, run the applicable checks, update affected docs, and leave the PR/Issue evidence required by DoD. Verify the result against the actual PR, CI and merge SHA. Record the session boundary and outcome in the owning Issue. A same-session walkthrough, static fixture or CI checkout is not an independent Agent acceptance.

### Automated contract checks

The existing `pnpm docs:check` validates the Agent form IDs/required fields and priority choices, the startup/closure and DoD anchors, and the PR handoff template. On pull_request events with the Agent task marker, it also checks that the PR contains one linked Issue and nonempty baseline, documentation, evidence, rollback and handoff fields. The marker is part of the manual PR template; remove it only for non-Agent intake (for example automated dependency PRs). Existing legacy PRs without the marker remain compatible. This is a structural guard, not proof that a referenced Issue exists, dependency graphs are acyclic, docs actually reflect behavior or tests/real-device evidence are truthful; review those against GitHub and the repository before merge. No new workflow, token permission or release action is needed.
