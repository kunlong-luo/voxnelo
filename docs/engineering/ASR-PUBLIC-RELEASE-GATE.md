# Voxnelo — public native ASR release decision gate

**Status for v1.0.4 native expansion: NOT APPROVED FOR PUBLICATION (pending evidence).** This gate separates CI-ready **internal candidates** from an accepted public native ASR rollout. It does not supersede the frozen V0.1 PRD, revoke the already public v1.0.3 unsigned release, or declare #45 complete. See [pinned upstream license evidence](MOONSHINE-V1.0.4-LICENSE-EVIDENCE.md).

## Release boundaries

- **Standard package (no staged model):** may be evaluated for an Early Access release against the F001–F012 acceptance matrix, but must explain that native local dictation is not bundled, and must not promise universal offline ASR.
- **Internal ASR candidate:** permitted only for controlled build/test; a reproducible WAV result or valid SHA-256 manifest does not authorize publication.
- **Public expanded native-ASR v1.0.4 installer:** HOLD until the relevant new-platform evidence below has a reviewer, dated artifact SHA and explicit release approval. The owner has explicitly allowed **unsigned** desktop releases with SmartScreen/Gatekeeper/notarization limitations accurately disclosed; signature is optional, not an automatic release blocker. However, the unsigned decision does **not** waive license, privacy, real microphone or functionality review. Never treat an Actions artifact or a successful private Draft as automatic authorization to publish.

## Evidence ledger (complete separately for each OS/arch and exact artifact SHA-256)

| Gate | Required evidence | Current decision |
| --- | --- | --- |
| Model provenance and distribution rights | Upstream model URL + immutable revision + verified weight hashes; reviewed license text, attribution/notice obligations and redistribution scope | **Upstream MIT statement recorded** for English Medium Streaming ([evidence](MOONSHINE-V1.0.4-LICENSE-EVIDENCE.md)); exact quantized download provenance/notices and distribution terms **pending** |
| Native runtime distribution rights | Exact native package/version/source, all transitive dynamic library licenses, redistribution rights, notices and reviewed hashes | Pinned `moonshine-voice==0.0.65`, PyPI MIT metadata identified; per-platform wheels/linked dependencies/notices **pending** |
| ABI/runtime compatibility | Exact Electron/Node ABI, OS/arch, installer SHA-256, native module load and end-to-end transcript on installed build | **Pending physical-platform QA** |
| Privacy and consent | Mic access only after explicit action, offline path verified, on-disk artifacts and permissions checked; online transfer absent unless specifically opted in | **Pending physical-device QA** |
| Recognition quality | Consented nonsensitive real-microphone quiet/noise paired set (≥10 sentences per condition), weighted WER, first partial and stop-to-final latency; failure handling | **Pending measured human data** |
| Reliability | 10-minute session, repeated Stop/restart and sentence changes, mic disconnect/permission rejection, resource cleanup; #38 evidence | **Pending physical-device QA** |
| Visual and accessibility | #55 U3 two-theme review, keyboard/font/DPI Windows/macOS/Linux observations | **Pending design sign-off** |
| Signing and delivery | Signed vs unsigned decision, fresh install/in-place upgrade preserving local records, artifact checksum and truthful release notes | **Unsigned expressly chosen by owner**; install/upgrade and risk-disclosure evidence still **pending** |
| F001–F012 learning flow | Filled `V0.1-ACCEPTANCE-MATRIX.md` with real user/device evidence, including copyright/content checks | **Pending acceptance** |

Use evidence entries of the form:
`gate | tested artifact SHA-256 | OS/arch | reviewer/date | evidence reference (no private paths or audio) | pass/fail/waiver with rationale`.

## Automation boundaries and known code risk

- `scripts/check-asr-staging.mts` proves inventory/integrity, **not** lawful redistribution.
- `scripts/check-asr-real-release.mts` runs a reference WAV check when a staged manifest exists; it now requires exact boolean `releaseReady:true` when native assets are staged, and rejects absent, false, null, and nonboolean approvals. This **fail-closed technical check does not grant legal authorization**; reviewers must establish all evidence before setting approval.
- `.github/workflows/release.yml` uploads **unsigned, time-limited candidate artifacts**; successful CI does not fulfill signature, real-hardware, legal or human WER requirements.
- `pnpm asr:batch` reports private offline WAV aggregate WER/RTF; it does not measure live partial/final subtitle latency or device DSP.

**Release owner decision: HOLD public v1.0.4 expanded native-ASR rollout pending new evidence.** The current standard installers do not bundle SDK or model weights; the user must explicitly install optional Moonshine components. Public v1.0.3 exists as a separate historical unsigned release. The private v1.0.4 Draft still targets commit `4aeb58e`, whereas `main` moved after the dependency-security fix; do not claim a fresh main build or overwrite draft/public artifacts. Keep #45/#123 open until the relevant new-engine evidence is approved. Never upload personal microphone recordings, device IDs, transcripts or private model paths to the repository.
