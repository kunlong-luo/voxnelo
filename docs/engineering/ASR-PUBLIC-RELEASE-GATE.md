# Voxnelo — public native ASR release decision gate

**Status: NOT APPROVED (pending evidence).** This checklist separates CI-ready **internal candidates** from a publicly distributable ASR-enabled installer. It does not supersede the frozen V0.1 PRD or declare #45 complete.

## Release boundaries

- **Standard package (no staged model):** may be evaluated for an Early Access release against the F001–F012 acceptance matrix, but must explain that native local dictation is not bundled, and must not promise universal offline ASR.
- **Internal ASR candidate:** permitted only for controlled build/test; a reproducible WAV result or valid SHA-256 manifest does not authorize publication.
- **Public ASR-enabled installer:** BLOCKED until each row below has a reviewer, dated evidence and an explicit approval. Never publish an unsigned CI artifact as the stable public installer.

## Evidence ledger (complete separately for each OS/arch and exact artifact SHA-256)

| Gate | Required evidence | Current decision |
| --- | --- | --- |
| Model provenance and distribution rights | Upstream model URL + immutable revision + verified weight hashes; reviewed license text, attribution/notice obligations and redistribution scope | **Pending legal review** |
| Native runtime distribution rights | Exact native package/version/source, all transitive dynamic library licenses, redistribution rights, notices and reviewed hashes | **Pending legal review** |
| ABI/runtime compatibility | Exact Electron/Node ABI, OS/arch, installer SHA-256, native module load and end-to-end transcript on installed build | **Pending physical-platform QA** |
| Privacy and consent | Mic access only after explicit action, offline path verified, on-disk artifacts and permissions checked; online transfer absent unless specifically opted in | **Pending physical-device QA** |
| Recognition quality | Consented nonsensitive real-microphone quiet/noise paired set (≥10 sentences per condition), weighted WER, first partial and stop-to-final latency; failure handling | **Pending measured human data** |
| Reliability | 10-minute session, repeated Stop/restart and sentence changes, mic disconnect/permission rejection, resource cleanup; #38 evidence | **Pending physical-device QA** |
| Visual and accessibility | #55 U3 two-theme review, keyboard/font/DPI Windows/macOS/Linux observations | **Pending design sign-off** |
| Signing and delivery | Target-specific signature/notarization decision, fresh install and in-place upgrade preserving local records, checksum and release notes | **Pending release review** |
| F001–F012 learning flow | Filled `V0.1-ACCEPTANCE-MATRIX.md` with real user/device evidence, including copyright/content checks | **Pending acceptance** |

Use evidence entries of the form:
`gate | tested artifact SHA-256 | OS/arch | reviewer/date | evidence reference (no private paths or audio) | pass/fail/waiver with rationale`.

## Automation boundaries and known code risk

- `scripts/check-asr-staging.mts` proves inventory/integrity, **not** lawful redistribution.
- `scripts/check-asr-real-release.mts` runs a reference WAV check when a staged manifest exists; it now requires exact boolean `releaseReady:true` when native assets are staged, and rejects absent, false, null, and nonboolean approvals. This **fail-closed technical check does not grant legal authorization**; reviewers must establish all evidence before setting approval.
- `.github/workflows/release.yml` uploads **unsigned, time-limited candidate artifacts**; successful CI does not fulfill signature, real-hardware, legal or human WER requirements.
- `pnpm asr:batch` reports private offline WAV aggregate WER/RTF; it does not measure live partial/final subtitle latency or device DSP.

**Release owner decision: HOLD public bundled-native-ASR release.** For a standard Early Access build, review the V0.1 functional acceptance and clearly label absent ASR. Keep #45 open until all required evidence is dated and approved. Do not place human microphone recordings, device IDs or private model paths in the repository.
