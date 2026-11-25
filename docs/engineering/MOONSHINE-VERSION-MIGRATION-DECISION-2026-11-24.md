# Voxnelo — Moonshine 0.0.65 vs 0.1.6 model/runtime migration decision (2026-11-24)

**Decision: retain the current v1.0.4 candidate pins; do not change the default engine or publish v1.0.4. A Moonshine 0.1.6 migration is a separate, unapproved research option.**

This document records read-only, version-specific upstream source comparisons. It is **not** a benchmark, compatibility test, real microphone result, model-build attestation, license sign-off or permission to release. Public latest is v1.0.3. The existing private Draft Release ID `428750217` was built from older source `4aeb58e...` with eight assets; no later source change automatically appears in those binaries.

## Immutable upstream source checkpoints

| Dimension | Current Voxnelo native candidate | Separately considered newer upstream |
| --- | --- | --- |
| Python SDK | `moonshine-voice==0.0.65` (existing pinned Python 3.12 platform Wheel SHA inventory) | Upstream tagged `v0.1.6`, resolved Git commit [`d8d8fa29d05ca67441a7719e70099f9f48917a93`](https://github.com/moonshine-ai/moonshine/commit/d8d8fa29d05ca67441a7719e70099f9f48917a93); **not** installed or built in Voxnelo |
| English Medium Streaming CDN path | [v0.0.65 Python downloader](https://github.com/moonshine-ai/moonshine/blob/v0.0.65/python/src/moonshine_voice/download.py): `model/medium-streaming-en/quantized/` (unversioned directory) | [v0.1.6 tagged native model catalog](https://github.com/moonshine-ai/moonshine/blob/d8d8fa29d05ca67441a7719e70099f9f48917a93/core/moonshine-model-catalog.cpp): `model/medium-streaming-en/quantized_26_11_02/` |
| Model file layout | **Eight fixed bytes:** `adapter.ort`, `cross_kv.ort`, `decoder_kv.ort`, `decoder_kv_with_attention.ort`, `encoder.ort`, `frontend.ort`, `streaming_config.json`, `tokenizer.bin` | Current [v0.1.6 catalog function](https://github.com/moonshine-ai/moonshine/blob/d8d8fa29d05ca67441a7719e70099f9f48917a93/core/moonshine-model-catalog.cpp) lists eight base streaming files, including **`frontend.model.ort` + `frontend.weights.ort` instead of `frontend.ort`**; `decoder_kv_with_attention.ort` is a **separate ninth, opt-in file** when word timestamps are requested. This is a different manifest, **not a rename or byte-compatible swap** |
| Download catalog ownership | Old `download.py` has the legacy path and fixed naming | [v0.1.6 Python downloader](https://github.com/moonshine-ai/moonshine/blob/d8d8fa29d05ca67441a7719e70099f9f48917a93/language-bindings/python/src/moonshine_voice/download.py) obtains STT URLs/file lists from the **native C catalog**; the downloader no longer maintains a duplicate hard-coded Python list |
| Byte provenance | Voxnelo's eight hashes match its earlier observed candidate bytes; the available official **immutable** dated `quantized_26_07_30` report matches **only 2/8** and does not authenticate the other six | The [public original-Wheel/asset mirror `TRANSFER_REPORT.tsv`](https://huggingface.co/moonshine-ai/moonshine-voice-assets/raw/main/TRANSFER_REPORT.tsv), rechecked 2026-11-24, still lists `quantized_26_07_30` for this English Medium model but **not** `quantized_26_11_02`. Tagged v0.1.6 catalog paths alone do not provide an immutable publisher-authored **SHA-256** manifest for the new files; **new candidate SHA-256 and publisher rights remain unverified** |

**Do not mix the SDKs, eight-file lists, revisions, caches or integrity hashes.** The former 2/8 match is specific to the **different** `quantized_26_07_30` directory. It is not a pass for the existing `quantized/` candidate or for the v0.1.6 `quantized_26_11_02` source.

## What changed upstream — observations, not Voxnelo test outcomes

The tagged [Moonshine 0.1.6 upstream changelog](https://github.com/moonshine-ai/moonshine/blob/d8d8fa29d05ca67441a7719e70099f9f48917a93/CHANGELOGS.md) documents:

- **Windows:** ONNX Runtime worker sizing/spin control for Intel hybrid CPUs and retention of its memory arena; an upstream report says some Windows workloads were **up to 10× slower** before the change. No Windows Voxnelo speedup has been measured.
- **Stream reliability:** fixes VAD recurrent state contamination between streams, transcriber close while stream processing, and audio subsystem behavior; relevant to repeated stop/restart and mic-disconnect tests but **not evidence that Voxnelo now passes them**.
- **Model weights:** a new `quantized_26_11_02` English streaming quantization with an untied decoder projection. The upstream changelog describes approximately **20% faster Medium decoding** in its own tests; this is **not** Voxnelo's latency/CPU/accuracy benchmark.
- **Earlier 0.1.5 format:** the front end split into model/weights files in `quantized_26_08_21`. v0.1.6 continues that split and uses the later dated directory.
- **License declaration:** the [immutable v0.1.6 license guidance](https://github.com/moonshine-ai/moonshine/blob/d8d8fa29d05ca67441a7719e70099f9f48917a93/docs/license.md) calls **English and streaming speech-to-text models MIT** while explicitly reserving each `core/third-party` package's own license; this describes a model family and source, **not** a completed rights review for Voxnelo's exact old/new tensors or native Wheel transitives.

## Two implementation choices — neither authorizes release yet

| Choice | Benefit | Hard blockers | Decision |
| --- | --- | --- | --- |
| **A. Retain pinned v0.0.65 and exact eight legacy hashes** | Preserves the already-tested native worker and Python 3.12 per-platform Wheel identity; no ABI/model migration | Obtain a trustworthy publisher-authored immutable manifest for **all eight** old `quantized/` bytes and version-specific permissions/notices. Complete actual private LICENSE/NOTICE review, final installer attribution, and **direct human physical-mic QA** | **Current internal candidate; public HOLD** |
| **B. Separately pilot exact upstream v0.1.6 and matching `quantized_26_11_02`** | Worth investigating upstream performance/reliability changes and newer versioned asset path | Rebuild pinned per-OS Python 3.12 dependency/SHA inventory; verify the **new actual file list** and **all eight/effective optional ninth** file byte hashes against a publisher-authored immutable SHA-256 manifest; audit new native dependencies/legal texts; implement/test runtime worker API and staged-install compatibility; rerun CI + actual per-device microphone WER/latency/permissions + upgrades without data loss | **Research/prototype only; not a change request to default or Draft** |

No downgrade to Zipformer, silent SDK switch, rewrite of pinned hash constants, replacement of the existing Draft binaries, or publication is authorized by this document.

## Executable decision gates for a future scoped migration PR

1. **Acquire authoritative upstream assets.** First resolve the [unsent publisher request](MOONSHINE-UPSTREAM-EVIDENCE-REQUEST-2026-11-23.md) and identify the official exact-version manifest/sha/revision for old and/or new `quantized_` tensors. A direct CDN download, CRC32C, or a newer model-family MIT declaration **alone** cannot establish all required rights or immutable SHA-256 provenance.
2. **Freeze an isolated pilot source revision.** Do not mutate the v1.0.4 Draft or existing production pins. Specify `v0.1.6` Git commit, Python 3.12 ABI, OS/arch, **model manifest / conditional attention file**, CDN source, hash list and local cache isolation. Track source commit and installer SHA for every private artifact.
3. **Verify legal/NOTICE and build inputs.** Reproduce fresh PyPI per-platform locked Wheel hashes, original Wheel legal-file/native inventories, private review of actual texts, ONNX Runtime / NumPy / OpenBLAS / PortAudio obligations, and actual final Electron/npm artifact notices. Record human reviewer, date and license scope, not only classifier labels.
4. **Prove functional compatibility.** In separate sandboxed Linux x64, Windows x64, macOS 15+ ARM64 candidate builds, test native worker protocol, interim/final subtitles, cancellation/stale-result isolation, VAD state reset, mic denial/disconnect, offline behavior, model opt-in and clean upgrade preserving history. Fail closed on missing/incorrect model files.
5. **Measure accuracy and latency on real hardware.** Use the [existing direct-human physical-microphone ledger](../release/V1.0.4-PHYSICAL-DEVICE-EVIDENCE.md) and identical consented quiet/noisy reference sentences for comparable v0.0.65 vs proposed candidate **on each platform**. Record weighted WER, first-visible/final subtitle latency, CPU/RAM and 10-minute sessions; clearly separate synthetic/WAV tests from real microphones. No invented thresholds or scores.
6. **Decide separately, then ship only if explicitly authorized.** Keep fallback/rollback safe and local data intact; require reviewer sign-off for each legal/model/hardware product gate. A green CI, upstream benchmark, successful hash match or PR merge does **not** permit publishing the existing Draft.

### Current next action (without changing code or models)

The maintainer can **review and decide whether to send** the prepared [publisher evidence request](MOONSHINE-UPSTREAM-EVIDENCE-REQUEST-2026-11-23.md). It has **not** been sent. That response, or another verifiable official immutable manifest and version-specific licensing evidence, is the dependency for choosing **A vs B**. Independently, a consented human with the actual candidate installer can collect the still-missing three-platform microphone evidence.

**Release gate: HOLD / not approved.** No current v1.0.4 direct-human microphone outcomes, model SHA attestation for all old or new bytes, license-text approval or publication approval is claimed here.

## Legacy model corroboration update — 2026-11-25

The official v0.0.65 source tag resolves to c09053306769543292b676c0c1e6bd55b2b6ca38 and its LICENSE specifically includes English models under MIT. A third-party immutable Milkrice mirror now corroborates 7/8 legacy SHA-256 declarations (six actual LFS pointer OIDs, one README-only digest); the attention decoder is absent. See the detailed [publisher evidence request](MOONSHINE-UPSTREAM-EVIDENCE-REQUEST-2026-11-23.md) for exact source identities and scope. This is additional metadata corroboration, not independently downloaded model bytes, publisher attestation or permission to switch CDN. The official dated 26_07_30 report remains 2/8; the asset ref API was unavailable in this check. Maintain option A pins and the all-eight publisher request; do not substitute the third-party mirror or begin an SDK migration. No change to the exact review candidate e35cc3a. HOLD.
