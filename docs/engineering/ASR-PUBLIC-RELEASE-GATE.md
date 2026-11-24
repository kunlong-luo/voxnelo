# Voxnelo — public native ASR release decision gate

**Status for v1.0.4 native expansion: NOT APPROVED FOR PUBLICATION (pending evidence).** This gate separates CI-ready **internal candidates** from an accepted public native ASR rollout. It does not supersede the frozen V0.1 PRD, revoke the already public v1.0.3 unsigned release, or declare #45 complete. See [pinned upstream license evidence](MOONSHINE-V1.0.4-LICENSE-EVIDENCE.md), the [2026-11-23 model SHA and original-Wheel rights reconciliation](MOONSHINE-V1.0.4-PROVENANCE-AND-NOTICES-2026-11-23.md), the [exact eight-hash upstream evidence request (not sent)](MOONSHINE-UPSTREAM-EVIDENCE-REQUEST-2026-11-23.md), and the [per-platform real human microphone evidence ledger](../release/V1.0.4-PHYSICAL-DEVICE-EVIDENCE.md) (all current new-engine sign-offs pending).

## Release boundaries

- **Standard package (no staged model):** may be evaluated for an Early Access release against the F001–F012 acceptance matrix, but must explain that native local dictation is not bundled, and must not promise universal offline ASR.
- **Internal ASR candidate:** permitted only for controlled build/test; a reproducible WAV result or valid SHA-256 manifest does not authorize publication.
- **Public expanded native-ASR v1.0.4 installer:** HOLD until the relevant new-platform evidence below has a reviewer, dated artifact SHA and explicit release approval. The owner has explicitly allowed **unsigned** desktop releases with SmartScreen/Gatekeeper/notarization limitations accurately disclosed; signature is optional, not an automatic release blocker. However, the unsigned decision does **not** waive license, privacy, real microphone or functionality review. Never treat an Actions artifact or a successful private Draft as automatic authorization to publish.

## Evidence ledger (complete separately for each OS/arch and exact artifact SHA-256)

| Gate | Required evidence | Current decision |
| --- | --- | --- |
| Model provenance and distribution rights | Upstream model URL + immutable revision + verified weight hashes; reviewed license text, attribution/notice obligations and redistribution scope | **Upstream MIT model-family statement recorded**; only **2/8** candidate model hashes match the currently available dated official mirror manifest, so immutable exact-byte asset mapping and redistribution/notices remain **PENDING** ([comparison](MOONSHINE-V1.0.4-PROVENANCE-AND-NOTICES-2026-11-23.md)) |
| Native runtime distribution rights | Exact native package/version/source, all transitive dynamic library licenses, redistribution rights, notices and reviewed hashes | Complete per-platform Python 3.12 Wheel hashes enforced and native CI-verified; [actual read-only three-OS original-Wheel recheck #45188947162](https://github.com/kunlong-luo/voxnelo/actions/runs/45188947162) found **0 missing declared License-File paths** on all targets. The actual legal texts, embedded runtime linkage, attribution and third-party rights **remain PENDING** |
| ABI/runtime compatibility | Exact Electron/Node ABI, OS/arch, installer SHA-256, native module load and end-to-end transcript on installed build | **Pending physical-platform QA** |
| Privacy and consent | Mic access only after explicit action, offline path verified, on-disk artifacts and permissions checked; online transfer absent unless specifically opted in | **Pending physical-device QA** |
| Recognition quality | Consented nonsensitive real-microphone quiet/noise paired set (≥10 sentences per condition), weighted WER, first partial and stop-to-final latency; failure handling | **Pending measured human data** |
| Reliability | 10-minute session, repeated Stop/restart and sentence changes, mic disconnect/permission rejection, resource cleanup; #38 evidence | **Pending physical-device QA** |
| Visual and accessibility | #55 U3 two-theme review, keyboard/font/DPI Windows/macOS/Linux observations | **Pending design sign-off** |
| Signing and delivery | Signed vs unsigned decision, fresh install/in-place upgrade preserving local records, artifact checksum and truthful release notes | **Unsigned expressly chosen by owner**; install/upgrade and risk-disclosure evidence still **pending** |
| F001–F012 learning flow | Filled `V0.1-ACCEPTANCE-MATRIX.md` with real user/device evidence, including copyright/content checks | **Pending acceptance** |

Use evidence entries of the form:
`gate | tested artifact SHA-256 | OS/arch | reviewer/date | evidence reference (no private paths or audio) | pass/fail/waiver with rationale`.

### Original-Wheel metadata identity and evidence interpretation (2026-11-24)

In addition to SHA-256 and the `License-File` presence checks, the read-only original-Wheel inspector must now bind the top-level `.dist-info` root to the exact normalized pinned distribution/version. This prevents assigning a foreign package's legal-file inventory to the candidate Wheel. The [Moonshine provenance and NOTICE audit](MOONSHINE-V1.0.4-PROVENANCE-AND-NOTICES-2026-11-23.md) distinguishes older successful three-platform inventories from the subsequent stricter check. A passing root-identity check is **not** a signature, legal clearance, actual runtime linkage proof or authorization to publish.


## Automation boundaries and known code risk

- `scripts/check-asr-staging.mts` proves inventory/integrity, **not** lawful redistribution.
- `scripts/check-asr-real-release.mts` runs a reference WAV check when a staged manifest exists; it now requires exact boolean `releaseReady:true` when native assets are staged, and rejects absent, false, null, and nonboolean approvals. This **fail-closed technical check does not grant legal authorization**; reviewers must establish all evidence before setting approval.
- `.github/workflows/release.yml` uploads **unsigned, time-limited candidate artifacts**; successful CI does not fulfill signature, real-hardware, legal or human WER requirements.
- `pnpm asr:batch` reports private offline WAV aggregate WER/RTF; it does not measure live partial/final subtitle latency or device DSP.
- `pnpm asr:moonshine:upstream:refs` is an **opt-in**, read-only upstream reference audit. It compares version-tagged immutable text catalogs and cannot approve model rights; exit 2 for no `v0.0.65` tag, incomplete eight legacy SHA-256 catalog or unavailable upstream metadata must **not** be converted to release approval. See the [publisher evidence request](MOONSHINE-UPSTREAM-EVIDENCE-REQUEST-2026-11-23.md).

**Release owner decision: HOLD public v1.0.4 expanded native-ASR rollout pending new evidence.** The current standard installers do not bundle SDK or model weights; the user must explicitly install optional Moonshine components. Public v1.0.3 exists as a separate historical unsigned release. The private v1.0.4 Draft still targets commit `4aeb58e`, whereas `main` moved after the dependency-security fix; do not claim a fresh main build or overwrite draft/public artifacts. Keep #45/#123 open until the relevant new-engine evidence is approved. Never upload personal microphone recordings, device IDs, transcripts or private model paths to the repository.
