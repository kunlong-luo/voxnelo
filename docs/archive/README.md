# Retired one-time GitHub Actions workflows

These YAML files are **historical source snapshots, not executable Actions**. Nine retired, version-specific workflows were moved out of `.github/workflows/` during 2026-11-21 cleanup (the two private v1.0.4 Draft writers first, then the seven completed v0.1.5–v1.0.3 publisher/Draft workflows). Source bytes, Git history, earlier Actions runs, tags and Release assets remain untouched. Automated regression tests check original Git blob IDs and absence of executable entries for the seven latter workflows.

| Archived file | Purpose and disposition |
| --- | --- |
| [publish-linux-v0.1.5.yml](workflows/publish-linux-v0.1.5.yml) | Original disabled v0.1.5 Linux Early Access publisher; original script and integrity checks retained byte-for-byte |
| [publish-all-v0.1.6.yml](workflows/publish-all-v0.1.6.yml) | Original disabled v0.1.6 three-platform Early Access publisher |
| [prepare-v0.1.7-draft-once.yml](workflows/prepare-v0.1.7-draft-once.yml) | Original disabled, completed private v0.1.7 Draft generator |
| [publish-all-v1.0.0.yml](workflows/publish-all-v1.0.0.yml) | Original disabled v1.0.0 unsigned official publisher |
| [publish-all-v1.0.1.yml](workflows/publish-all-v1.0.1.yml) | Original disabled v1.0.1 unsigned official publisher |
| [publish-all-v1.0.2.yml](workflows/publish-all-v1.0.2.yml) | Original disabled v1.0.2 unsigned official publisher |
| [publish-all-v1.0.3.yml](workflows/publish-all-v1.0.3.yml) | Original disabled v1.0.3 unsigned official publisher |
| [prepare-v1.0.4-private-draft-once.yml](workflows/prepare-v1.0.4-private-draft-once.yml) | Original path-filtered, write-capable bootstrap for the **unpublished** v1.0.4 draft; retired because the draft already exists |
| [repair-v1.0.4-private-draft-win-checksum-once.yml](workflows/repair-v1.0.4-private-draft-win-checksum-once.yml) | Original path-filtered/manual write-capable checksum repair for a specific private Draft Release ID; retained as audit evidence, no longer executable |

The [release operations guide](../engineering/RELEASE-OPERATIONS.md) is the maintained source for release procedures. The generic audited [release draft workflow](../../.github/workflows/release-draft.yml) remains available for **new** versions under its existing checks. The [v1.0.4 review-only workflow](../../.github/workflows/v1.0.4-review-installers.yml) is retained separately for manual nonpublishing verification.

Deleting an old workflow does not delete the historical GitHub Actions logs or the existing private Draft. The draft's presence and asset inventory were checked on 2026-11-21, but checksum consistency, authorization, human review, actual publication and device acceptance are **not** inferred from an inventory. If an old draft needs further repair, create a new reviewed, explicitly authorized process instead of reactivating these one-time scripts.

The obsolete root `INSTALL-TO-LOCAL.md` (starter ZIP, local personal path, older pnpm bootstrap) was removed; use the [current development instructions](../DEVELOPMENT.md). Its original contents remain in Git history.

Do not execute an archived workflow by moving it back into `.github/workflows/` without renewed review and user authorization.
