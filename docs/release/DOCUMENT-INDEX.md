# Voxnelo documentation navigation and status

Updated: 2026-11-21. This is an **index, not evidence of a public v1.0.4 release**. Latest public release: **v1.0.3**; current source candidate: **v1.0.4**. Check actual GitHub Releases before changing this status.

## Maintained entries

- **End users:** [English README](../../README.md), [中文 README](../../README.zh-CN.md), [cross-platform user guide](../USER-GUIDE.md), [privacy](../PRIVACY.md), [security](../../SECURITY.md).
- **Engineering:** [development](../DEVELOPMENT.md), [release operations](../engineering/RELEASE-OPERATIONS.md), [toolchain compatibility](../engineering/NODE26-LTS-MIGRATION.md), [repository governance](../engineering/REPOSITORY-GOVERNANCE.md), [documentation index](../README.md).
- **Product and evidence:** [23-ID PRD/code/test matrix](PRD-TRACEABILITY.md), [offline ASR benchmark protocol](ASR-BENCHMARK-PROTOCOL.md), [connected-speech/audio review](../engineering/CONNECTED-SPEECH-AUDIO-REVIEW.md), [release readiness](../engineering/STABLE-RELEASE-READINESS.md), [ASR release gate](../engineering/ASR-PUBLIC-RELEASE-GATE.md), [unsigned owner decision](UNSIGNED-V1-OWNER-DECISION.md).

## Source baseline and historical provenance

- **Frozen original requirement baseline:** [Product Docs v1.0](../Voxnelo-Product-Docs-v1.0/README.md), including original DOCX/PDF and checksums. Do not rewrite it during maintenance.
- **Historical source/test audits:** [November documentation audit](../audits/2026-11-16-DOCUMENTATION-GAP-AUDIT.md), [initial PRD/release audit](../audits/2026-11-16-PRD-RELEASE-GAP-AUDIT.md), [superseded matrix starter](PRD-TRACEABILITY-STARTER.md), [historical V0.1 checklist](V0.1-PRD-CHECKLIST.md) and [technical-debt register](../engineering/TECH-DEBT-2026-11-16.md). Their assertions are dated; do not treat them as current code state.
- **Retired executable workflow source:** [archive index](../archive/README.md), including v1.0.4 private draft creation and Windows checksum repair. These files are no longer registered under `.github/workflows/`.
- **November 21 cleanup decision log:** [repository cleanup audit](../audits/2026-11-21-REPOSITORY-CLEANUP.md).

## Status and remaining gates

- **Implemented tooling:** source/test file mappings exist for all 23 original PRD IDs; `pnpm docs:check` validates maintained local links/commands; CI checks Node/pnpm pin consistency; user guide describes Windows/macOS/Linux. Existence of documentation does not prove acceptance.
- **Still unverified or independently gated:** real-microphone quiet/noise/accent accuracy and latency per OS, physical accessibility tests (including screen readers/zoom), complete content/IPA/audio licensing and language review, signed/notarized credentials where applicable, and explicit publication authorization.
- **Maintenance rule:** update this index and [the main docs index](../README.md) when promoting or retiring sources; retain historical tests/evidence unless deletion is justified with checked references. Never claim historical audit observations describe the current installer without reconfirmation.
