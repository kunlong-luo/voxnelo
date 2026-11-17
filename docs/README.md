# Voxnelo documentation index

Updated: 2026-11-16. This index is navigation, **not** a release approval.

## Source of truth and precedence

1. Original frozen product baseline: [Product Docs v1.0](Voxnelo-Product-Docs-v1.0/README.md) and its original DOCX/PDF. Preserve these files and their checksums.
2. Actual behavior: current `main` source and tests. Code alone does not prove acoustic, legal, accessibility, or hardware acceptance.
3. Current release state: GitHub Releases (published versus Draft), package version, and [release operations](engineering/RELEASE-OPERATIONS.md). Never infer publication from `package.json`.
4. Human review evidence: independently collected private evidence; CI is not an approval.

## Current guides

- [User guide](USER-GUIDE.md)
- [Development](DEVELOPMENT.md)
- [Privacy](PRIVACY.md)
- [PRD traceability — 23 IDs with code/test paths and unmet requirements](release/PRD-TRACEABILITY.md)
- [Release readiness](engineering/STABLE-RELEASE-READINESS.md)
- [ASR evidence and benchmark](engineering/ASR-ACCURACY-EXPERIMENTS.md)
- [Connected speech and licensed audio review](engineering/CONNECTED-SPEECH-AUDIO-REVIEW.md)
- [UI and accessibility audit](engineering/UI-ACCESSIBILITY-AUDIT-2026-11-16.md)
- [Audit findings and technical debt](engineering/TECH-DEBT-2026-11-16.md)

## Historical material

The [earlier PRD starter](release/PRD-TRACEABILITY-STARTER.md), `V0.1-*`, `V0.1.5-*`, `V0.1.6-*`, dated pilots and release notes are historical evidence, **not** current installation instructions. See [historical V0.1 checklist](release/V0.1-PRD-CHECKLIST.md). The original product baseline describes intended future features, not verified shipped features.

## Documentation maintenance policy

When changing a user-visible feature, update the user guide, PRD traceability, release notes (if applicable), and associated tests in the same PR. When changing model support, explicitly distinguish CI packaging, installed runtime, and physical microphone acceptance. Keep private recordings, rights agreements, reviewer identities and local file paths out of public docs.

## Offline documentation checks

Run `pnpm docs:check` to validate repository-local Markdown links and package-script commands in maintained user/release/engineering entry points. CI runs the same check on every PR. `pnpm docs:check:all` additionally scans historical Markdown and is an investigative command, not a required passing release gate. This check does **not** test external URLs, heading fragments, translations, screenshots or factual release claims; those require separate review.

The checker's implementation and regression tests live in `scripts/check-documentation.mts` and `tests/documentation-check.test.ts`. Before a new release, compare public/download wording with actual GitHub Releases and verify the real installers separately.
