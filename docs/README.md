# Voxnelo documentation index

Updated: 2026-11-24. This index is navigation, **not** a release approval.

## Source of truth and precedence

1. Original frozen product baseline: [Product Docs v1.0](Voxnelo-Product-Docs-v1.0/README.md) and its original DOCX/PDF. Preserve these files and their checksums.
2. Actual behavior: current `main` source and tests. Code alone does not prove acoustic, legal, accessibility, or hardware acceptance.
3. Current release state: GitHub Releases (published versus Draft), package version, and [release operations](engineering/RELEASE-OPERATIONS.md). Never infer publication from `package.json`.
4. Human review evidence: independently collected private evidence; CI is not an approval.

## Current guides

- [User guide](USER-GUIDE.md)
- [Development — pnpm-only source setup](DEVELOPMENT.md)
- [Node.js / pinned pnpm toolchain policy](engineering/NODE26-LTS-MIGRATION.md)
- [Build dependency license inventory and upstream archive audit](engineering/BUILD-LICENSE-INVENTORY.md)
- [Historical Zipformer personal pilot — not the default Moonshine installation](engineering/LOCAL-ASR-PERSONAL-PILOT.md)
- [Privacy — public v1.0.3 versus unpublished v1.0.4 source](PRIVACY.md)
- [PRD traceability — 23 IDs with code/test paths and unmet requirements](release/PRD-TRACEABILITY.md)
- [Release readiness](engineering/STABLE-RELEASE-READINESS.md)
- [v1.0.4 candidate release notes — not published](release-notes/v1.0.4.md)
- [Changelog (source history versus shipped releases)](../CHANGELOG.md)
- [ASR evidence and benchmark](engineering/ASR-ACCURACY-EXPERIMENTS.md)
- [v1.0.4 direct-human physical microphone evidence ledger and read-only local intake check — NOT accepted](release/V1.0.4-PHYSICAL-DEVICE-EVIDENCE.md)
- [Moonshine exact-version model provenance / third-party NOTICE gaps — HOLD](engineering/MOONSHINE-V1.0.4-PROVENANCE-AND-NOTICES-2026-11-23.md)
- [Moonshine 0.0.65 and 0.1.6 source/model migration comparison — no SDK switch](engineering/MOONSHINE-VERSION-MIGRATION-DECISION-2026-11-24.md)
- [Private original Wheel LICENSE/NOTICE text reviewer handoff — all decisions pending](engineering/MOONSHINE-PRIVATE-LICENSE-TEXT-REVIEW-2026-11-24.md)
- [Publisher request draft — NOT sent or approved](engineering/MOONSHINE-UPSTREAM-EVIDENCE-REQUEST-2026-11-23.md)
- [Connected speech and licensed audio review](engineering/CONNECTED-SPEECH-AUDIO-REVIEW.md)
- [UI and accessibility audit](engineering/UI-ACCESSIBILITY-AUDIT-2026-11-16.md)
- [V3 live dictation-first practice design (merged source, unshipped; scoped Chromium/Electron visual QA and pending human acceptance)](design/V3-DICTATION-FIRST-UX-2026-11-23.md)
- [Audit findings and technical debt](engineering/TECH-DEBT-2026-11-16.md)
- [Read-only module reachability audit (bundler roots, Workers and dynamic imports)](audits/2026-11-22-MODULE-REACHABILITY.md)

## Historical material

The [retired one-time workflow archive](archive/README.md) contains nine version-specific publish/Draft Actions snapshots (seven historical v0.1.5–v1.0.3 and two v1.0.4 private Draft writers), now removed from the executable workflow directory. The old root starter ZIP installation guide was removed; use [Development](DEVELOPMENT.md). Do not restore historical publishing workflows without a fresh review.

The [earlier PRD starter](release/PRD-TRACEABILITY-STARTER.md), `V0.1-*`, `V0.1.5-*`, `V0.1.6-*`, dated pilots and release notes are historical evidence, **not** current installation instructions. See [historical V0.1 checklist](release/V0.1-PRD-CHECKLIST.md). The original product baseline describes intended future features, not verified shipped features.

## Documentation maintenance policy

For JavaScript dependency or toolchain changes, keep the development guide, both root READMEs, toolchain policy, release operations and affected ASR instructions consistent. pnpm is the sole supported JavaScript package manager; the public npm registry remains the upstream archive source, not a command-line tool. When changing a user-visible feature, update the user guide, PRD traceability, release notes (if applicable), and associated tests in the same PR. When changing model support, explicitly distinguish CI packaging, installed runtime, and physical microphone acceptance. Keep private recordings, rights agreements, reviewer identities and local file paths out of public docs.

## Offline documentation checks

Run `pnpm docs:check` to validate repository-local Markdown links and package-script commands in maintained user/release/engineering entry points, including privacy, security, changelog, candidate notes and the module audit. CI runs the same check on every PR. `pnpm docs:check:all` additionally scans historical Markdown and is an investigative command, not a required passing release gate. This check does **not** test external URLs, heading fragments, translations, screenshots or factual release claims; those require separate review.

The checker's implementation and regression tests live in `scripts/check-documentation.mts` and `tests/documentation-check.test.ts`. Before a new release, compare public/download wording with actual GitHub Releases and verify the real installers separately.
