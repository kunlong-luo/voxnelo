# Voxnelo repository governance setup

The repository is **private**. Do not change visibility in order to copy Pagevela settings.

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
3. If GitHub reports that private-repo rulesets require an upgraded plan, do not expose the repository as a workaround. Record the restriction and use reviewed PRs as policy until eligible.

## Automation and release

- `.github/CODEOWNERS` points to the repository maintainer for audio, desktop, storage, product baseline and GitHub workflows. Reassign owners only to accounts with repository access.
- `.github/workflows/ci.yml` is the authoritative pull-request validation workflow. Check statuses before merge.
- `.github/workflows/release.yml` builds *unsigned* OS-specific desktop candidates on tag/manual dispatch, with read-only token and no publishing credentials. Uploaded artifacts are **not** a public release, signed installer or completed QA.
- Run the F001–F012 acceptance matrix and desktop microphone checks before any external release; AI realtime chat remains outside v0.1.

## Important

GitHub settings cannot be enforced merely by committing this document. A maintainer must verify the settings are enabled. Never assume pending GitHub checks have passed.
