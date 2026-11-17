# Voxnelo documentation and product traceability audit — 2026-11-16

> Status: evidence-based **partial audit**, not a full code or hardware certification. Baseline: `main` as inspected on 2026-11-16. Preserve the frozen original product documents without edits.

## Source of truth and release semantics

- Frozen requirements: [original PRD](../Voxnelo-Product-Docs-v1.0/docs/02-产品需求PRD.md) and [original acceptance plan](../Voxnelo-Product-Docs-v1.0/docs/08-测试验收与发布.md).
- Current software version in `package.json`: **1.0.4**. This is a source/package version, **not evidence of a published v1.0.4 release**.
- [Stable readiness](../engineering/STABLE-RELEASE-READINESS.md) identifies **v1.0.3** as the latest public unsigned release; v1.0.4 remains a draft according to [Issue #201](https://github.com/kunlong-luo/voxnelo/issues/201).
- The optional signed/notarized certification gate is **different from** the owner-approved unsigned release policy. Never imply that passing packaging CI establishes signature, notarization, legal approval, real-device accuracy or linguistic review.
- [User guide](../USER-GUIDE.md) is titled v1.0.0 and describes Windows/macOS Moonshine as uncommitted. **Confirmed documentation drift**: reconcile platform statements against current installer/worker tests and the actual release being documented before editing user-facing support claims.

## PRD → implementation → evidence traceability (initial inventory)

The following table captures **requirements and candidate evidence locations**, not a claim that all implementations or tests passed. Each row requires a subsequent source-level check and a real-device review where appropriate.

| Requirement | Frozen acceptance target | Evidence / review entry point | Verification status |
| --- | --- | --- | --- |
| F001 | Chinese first launch, no account, clear start | [V0.1 acceptance matrix](../engineering/V0.1-ACCEPTANCE-MATRIX.md); renderer entrypoint to locate | Source mapping pending |
| F002 | sentence, translation, level, scene, IPA, wrapping | [V0.1 acceptance matrix](../engineering/V0.1-ACCEPTANCE-MATRIX.md); UI component tests to locate | Source mapping pending |
| F003 | reference audio, slower playback, replay, failure | [User guide](../USER-GUIDE.md); playback source/provenance tests to locate | Source mapping pending |
| F004 | explicit microphone consent, record/stop/replay | [User guide](../USER-GUIDE.md); Electron microphone tests to locate | Hardware acceptance not inferred |
| F005 | change sentence; cancel previous audio | [Issue #201](https://github.com/kunlong-luo/voxnelo/issues/201) documents audio cancellation work | Code/test mapping pending |
| F006 | viewed vs practiced history, restart persistence | [V0.1 acceptance matrix](../engineering/V0.1-ACCEPTANCE-MATRIX.md) | Source mapping pending |
| F007 | favorite toggle and persistent navigation | [V0.1 acceptance matrix](../engineering/V0.1-ACCEPTANCE-MATRIX.md) | Source mapping pending |
| F008 | manual review labels, no fake scoring | [Frozen PRD](../Voxnelo-Product-Docs-v1.0/docs/02-产品需求PRD.md) | Source mapping pending |
| F009 | local IndexedDB and offline persistence | `dexie` dependency in root `package.json`; storage tests to locate | Dependency confirmed; behavior pending |
| F010 | 30–50 reviewed short phrases and rights | [Content review](../engineering/V0.1-CONTENT-REVIEW.md) | Human quality/licensing evidence pending |
| F011 | least privilege, no raw recording retention by default | [Privacy](../PRIVACY.md), [security](../../SECURITY.md) | Security/source audit pending |
| F012 | keyboard, focus, zoom | [V0.1 acceptance matrix](../engineering/V0.1-ACCEPTANCE-MATRIX.md) | Physical/UI audit pending |
| F101–F108 | v0.2/v0.3 enhancements | [Frozen PRD](../Voxnelo-Product-Docs-v1.0/docs/02-产品需求PRD.md) | Per-feature source/test mapping pending |
| S001 | SpeakFeed gestures and fallback | [Original release acceptance](../Voxnelo-Product-Docs-v1.0/docs/08-测试验收与发布.md) | Real gesture validation pending |
| S002 | Speak Karaoke, reliable word alignment | [Original release acceptance](../Voxnelo-Product-Docs-v1.0/docs/08-测试验收与发布.md) | Acoustic alignment validation pending |
| S003 | Smart Prompt, no interruption | [Original release acceptance](../Voxnelo-Product-Docs-v1.0/docs/08-测试验收与发布.md) | Real speaker validation pending |

**Scope-change note:** Original V0.1 explicitly excludes live ASR. Current offline dictation is later scope and needs its own requirement/change record, not a silent edit to the frozen PRD.

## Cross-platform end-user documentation backlog

The current [user guide](../USER-GUIDE.md) includes installation and troubleshooting, but is version-stale. For **each** Windows, macOS and Linux chapter, verify and document: exact supported OS/CPU, release asset name and SHA-256 verification, unsigned installer warning, first-run permissions, offline model install/verification and disk requirements, live dictation start/stop, audio device changes, offline behavior after installation, upgrade preserving user data, uninstall behavior, and redacted diagnostics. Do not expose `pnpm` commands as ordinary end-user instructions. Do not promise a platform is supported solely because a CI package was built.

## Reproducible ASR quality protocol

Use [ASR accuracy experiments](../engineering/ASR-ACCURACY-EXPERIMENTS.md) and `pnpm asr:batch` as existing starting points; do not invent scores.

1. Collect consented private WAVs, fixed references, multiple speakers and paired quiet/noise/external-playback scenarios. Record OS, CPU, model revision, microphone and acoustic setup privately.
2. Use identical audio per candidate; report **micro-averaged WER** = total (substitutions + deletions + insertions) / total reference words, by scenario, and **RTF** = inference elapsed / audio duration. Include sample count and reference-word count.
3. Separately measure live mic-to-first-partial, mic-stop-to-final, p50/p95 latency, dropped audio, memory, CPU and 10-minute stability on each actual OS. Offline batch RTF does **not** measure these live metrics.
4. Record failures/incomplete runs, not only favorable results. Synthetic CI audio validates plumbing, not real speech accuracy. Private recordings, paths and consent artifacts must not be committed.
5. Agree release thresholds **before** inspecting final holdout results; until then mark performance gate **NOT MEASURED**, not PASS.

## UI / accessibility audit checklist (not yet executed on hardware)

- Keyboard-only navigation through first-run, sentence, audio, microphone permissions, model manager and settings; no traps.
- Visible focus, accessible labels, dialog focus restoration, semantic status announcements and no reliance on color alone.
- 200% zoom, narrow desktop windows, Chinese/English overflow, high contrast, reduced motion and scroll behavior.
- Verify native system UI differences on Windows/macOS/Linux and screenshots against the design spec.
- Record screen, build, OS, steps, expected/actual and sanitized evidence. No claim of accessibility compliance without test results.

## Documentation index and historical retention

| Category | Canonical entry | Policy |
| --- | --- | --- |
| Frozen original | [Voxnelo Product Docs v1.0](../Voxnelo-Product-Docs-v1.0/README.md) | Do not rewrite; document deviations |
| User documentation | [User guide](../USER-GUIDE.md) | Must match an identified public version |
| Engineering | [Development](../DEVELOPMENT.md) | Commands must exist in package scripts |
| Architecture decisions | [ADR directory](../ADR/) | Retain decisions and supersession notes |
| Historical 0.1 acceptance | [V0.1 matrix](../engineering/V0.1-ACCEPTANCE-MATRIX.md) | Historical evidence; not current certification |
| Release | [Stable readiness](../engineering/STABLE-RELEASE-READINESS.md), [release operations](../engineering/RELEASE-OPERATIONS.md) | Distinguish unsigned published vs signed optional gate |
| Audio review | [Connected speech review](../engineering/CONNECTED-SPEECH-AUDIO-REVIEW.md), [Issue #201](https://github.com/kunlong-luo/voxnelo/issues/201) | No human approval or audio implied |

## Technical debt and follow-up actions

| Priority | Finding | Classification | Closure evidence |
| --- | --- | --- | --- |
| P0 | User guide v1.0.0 vs current source 1.0.4 / public 1.0.3 | Confirmed doc drift | Version-specific guide and accurate links |
| P0 | Windows/macOS model support statement may lag native implementation | Confirmed review needed; capability not independently certified | Platform code + physical installation check |
| P0 | No complete per-requirement source/test evidence in this audit | Audit gap | Source paths, test paths and outcomes per F/S ID |
| P0 | Real-device WER and live subtitle p95 not established by batch docs | Evidence gap | Private reproducible measurements, sanitized summary |
| P1 | Automated Markdown link/script checking not established by this audit | Verification pending | CI job, fixture tests, clean run |
| P1 | Full keyboard/zoom/contrast test evidence not established | Verification pending | OS-specific evidence and defects |
| P1 | Historic release docs need current/historic classification | Documentation organization | Canonical index and no contradictory claims |

This audit does **not** authorize release, approve audio, claim human review or certify all seven workstreams complete.
