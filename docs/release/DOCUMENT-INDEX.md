# Documentation navigation and historical status

- **Current user-facing entry points:** ../../README.md, ../../README.zh-CN.md, ../USER-GUIDE.md, ../PRIVACY.md, ../../SECURITY.md.
- **Current engineering entry points:** ../DEVELOPMENT.md, ../engineering/RELEASE-OPERATIONS.md, ../engineering/CONNECTED-SPEECH-AUDIO-REVIEW.md.
- **Release decision and gates:** UNSIGNED-V1-OWNER-DECISION.md, ../engineering/STABLE-RELEASE-READINESS.md, ../engineering/ASR-PUBLIC-RELEASE-GATE.md.
- **Original product baseline:** ../Voxnelo-Product-Docs-v1.0/README.md and its docs directory; original DOCX/PDF are frozen and may differ from updated Markdown.
- **Historical, not automatically current:** V0.1-PRD-CHECKLIST.md and the ../engineering/V0.1* and V0.1.5/V0.1.6 documents. Preserve for provenance; do not infer they describe the current installer.
- **Audit and follow-up:** ../audits/2026-11-16-DOCUMENTATION-GAP-AUDIT.md, PRD-TRACEABILITY-STARTER.md (historical), ASR-BENCHMARK-PROTOCOL.md, ../audits/2026-11-21-REPOSITORY-HYGIENE.md.

**Completed automation, not pending work:** [PRD→code→test path matrix](PRD-TRACEABILITY.md) (23 IDs; tests/requirements remain separately assessed), [maintained Markdown link and command checks](../../scripts/check-documentation.mts), [Node/pnpm consistency guard](../../scripts/check-toolchain-consistency.mts), and the [cross-platform user guide](../USER-GUIDE.md) (content is not proof of hardware QA).

**Remaining independent work:** real microphone/ASR benchmarks, physical UI/screen-reader/accessibility evidence, incomplete PRD implementation and external linguistic, copyright and audio-performer approvals. Historical one-time workflows and prior release notes should not be used to prepare a new version; see [repository hygiene audit](../audits/2026-11-21-REPOSITORY-HYGIENE.md).
