# Voxnelo documentation navigation and status

Updated: 2026-11-23. This is an **index, not evidence of a public v1.0.4 release**. Latest public release: **v1.0.3**; current source candidate: **v1.0.4**. Check actual GitHub Releases before changing this status.

## Maintained entries

- **End users:** [English README](../../README.md), [中文 README](../../README.zh-CN.md), [cross-platform user guide](../USER-GUIDE.md), [privacy](../PRIVACY.md), [security](../../SECURITY.md).
- **Current V3 UI (source iteration, not yet released):** [Dictation-first design, external references, accessibility and acceptance](../design/V3-DICTATION-FIRST-UX-2026-11-23.md). Its UI is **not** contained in the earlier SHA-checked v1.0.4 review installers from commit `7793c383`. [PR #264 deep Chromium/Linux Electron QA](https://github.com/kunlong-luo/voxnelo/actions/runs/45166540586) passed for its own PR head, and the [post-merge main CI](https://github.com/kunlong-luo/voxnelo/actions/runs/45168751524) passed separately; **physical accessibility, Moonshine licensing/provenance and v1.0.4 release gates remain open**.
- **Engineering:** [development](../DEVELOPMENT.md), [release operations](../engineering/RELEASE-OPERATIONS.md), [toolchain compatibility](../engineering/NODE26-LTS-MIGRATION.md), [repository governance](../engineering/REPOSITORY-GOVERNANCE.md), [documentation index](../README.md).
- **Product and evidence:** [23-ID PRD/code/test matrix](PRD-TRACEABILITY.md), [offline ASR benchmark protocol](ASR-BENCHMARK-PROTOCOL.md), [v1.0.4 human physical-microphone ledger / pending-only intake template](V1.0.4-PHYSICAL-DEVICE-EVIDENCE.md), [Moonshine exact model/NOTICE rights investigation](../engineering/MOONSHINE-V1.0.4-PROVENANCE-AND-NOTICES-2026-11-23.md), [unsent publisher request draft](../engineering/MOONSHINE-UPSTREAM-EVIDENCE-REQUEST-2026-11-23.md), [connected-speech/audio review](../engineering/CONNECTED-SPEECH-AUDIO-REVIEW.md), [release readiness](../engineering/STABLE-RELEASE-READINESS.md), [ASR release gate](../engineering/ASR-PUBLIC-RELEASE-GATE.md), [unsigned owner decision](UNSIGNED-V1-OWNER-DECISION.md).

## Source baseline and historical provenance

- **Frozen original requirement baseline:** [Product Docs v1.0](../Voxnelo-Product-Docs-v1.0/README.md), including original DOCX/PDF and checksums. Do not rewrite it during maintenance.
- **Historical source/test audits:** [November documentation audit](../audits/2026-11-16-DOCUMENTATION-GAP-AUDIT.md), [initial PRD/release audit](../audits/2026-11-16-PRD-RELEASE-GAP-AUDIT.md), [superseded matrix starter](PRD-TRACEABILITY-STARTER.md), [historical V0.1 checklist](V0.1-PRD-CHECKLIST.md) and [technical-debt register](../engineering/TECH-DEBT-2026-11-16.md). Their assertions are dated; do not treat them as current code state.
- **Retired executable workflow source:** [archive index](../archive/README.md), including all seven disabled historic v0.1.5–v1.0.3 release/Draft workflows and both v1.0.4 private Draft one-shot writers. These files are no longer registered under `.github/workflows/`.
- **November 21 cleanup decision log:** [repository cleanup audit](../audits/2026-11-21-REPOSITORY-CLEANUP.md).

## Status and remaining gates

- **Implemented tooling:** source/test file mappings exist for all 23 original PRD IDs; `pnpm docs:check` validates maintained local links/commands; CI checks Node/pnpm pin consistency; user guide describes Windows/macOS/Linux. Existence of documentation does not prove acceptance.
- **Moonshine legal-evidence inventory repair (2026-11-23):** [original Wheel ZIP / PEP 639 license declaration coverage and pending reviewer worklist](../engineering/MOONSHINE-V1.0.4-PROVENANCE-AND-NOTICES-2026-11-23.md). A [fresh three-platform real-Wheel audit](https://github.com/kunlong-luo/voxnelo/actions/runs/45188947162) passed at exact source `1e3d1274fbd52d48647cff960e698ca48b09275f`: Linux/Windows/macOS recorded **33/34/33** indexed LICENSE/NOTICE ZIP members, **30/31/30** declared license-file paths and **0/0/0 missing declared paths**. This is verified file-presence inventory, **not** actual license text, binary rights, model provenance or legal clearance.

- **Wheel metadata attribution safeguard (2026-11-24; pending new recheck):** [Moonshine original-Wheel license handoff](../engineering/MOONSHINE-V1.0.4-PROVENANCE-AND-NOTICES-2026-11-23.md) now documents a stricter match between the root-level `.dist-info/METADATA` location and the wheel's distribution identity. The last published 2026-11-23 inventory is historical for its tested commit; the new assertion requires its own three-OS CI verification. This does not resolve model ownership or human-microphone testing.

- **Still unverified or independently gated:** real-microphone quiet/noise/accent accuracy and latency per OS, physical accessibility tests (including screen readers/zoom), complete content/IPA/audio licensing and language review, signed/notarized credentials where applicable, and explicit publication authorization.
- **Maintenance rule:** update this index and [the main docs index](../README.md) when promoting or retiring sources; retain historical tests/evidence unless deletion is justified with checked references. Never claim historical audit observations describe the current installer without reconfirmation.
