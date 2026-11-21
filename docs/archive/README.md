# Retired one-time GitHub Actions workflows

These YAML files are **historical source snapshots, not executable Actions**. They were moved out of `.github/workflows/` during the 2026-11-21 maintenance cleanup. Git history, earlier Actions runs, tags and release assets remain untouched.

| Archived file | Purpose and disposition |
| --- | --- |
| [prepare-v1.0.4-private-draft-once.yml](workflows/prepare-v1.0.4-private-draft-once.yml) | Original path-filtered, write-capable bootstrap for the **unpublished** v1.0.4 draft; retired because the draft already exists |
| [repair-v1.0.4-private-draft-win-checksum-once.yml](workflows/repair-v1.0.4-private-draft-win-checksum-once.yml) | Original path-filtered/manual write-capable checksum repair for a specific private Draft Release ID; retained as audit evidence, no longer executable |

The [release operations guide](../engineering/RELEASE-OPERATIONS.md) is the maintained source for release procedures. The generic audited [release draft workflow](../../.github/workflows/release-draft.yml) remains available for **new** versions under its existing checks. The [v1.0.4 review-only workflow](../../.github/workflows/v1.0.4-review-installers.yml) is retained separately for manual nonpublishing verification.

Deleting an old workflow does not delete the historical GitHub Actions logs or the existing private Draft. The draft's presence and asset inventory were checked on 2026-11-21, but checksum consistency, authorization, human review, actual publication and device acceptance are **not** inferred from an inventory. If an old draft needs further repair, create a new reviewed, explicitly authorized process instead of reactivating these one-time scripts.

The obsolete root `INSTALL-TO-LOCAL.md` (starter ZIP, local personal path, older pnpm bootstrap) was removed; use the [current development instructions](../DEVELOPMENT.md). Its original contents remain in Git history.

Do not execute an archived workflow by moving it back into `.github/workflows/` without renewed review and user authorization.
