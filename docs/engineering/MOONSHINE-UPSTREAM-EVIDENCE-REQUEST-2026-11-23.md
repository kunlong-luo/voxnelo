# Publisher evidence request — Moonshine Voice 0.0.65 English Medium Streaming (v1.0.4 HOLD)

**Draft for a maintainer to send to the Moonshine publisher. NOT SENT.** Do not open a third-party issue or send this request under the owner's identity without approval. This document contains public model-file digests only, no private audio, paths or personal information.

## What Voxnelo needs confirmed

The publicly pinned Moonshine Voice Python SDK is `moonshine-voice==0.0.65`. Its [official tagged downloader](https://github.com/moonshine-ai/moonshine/blob/v0.0.65/python/src/moonshine_voice/download.py) selects English medium streaming assets at `https://download.moonshine.ai/model/medium-streaming-en/quantized/`, using eight files. Voxnelo requires a trustworthy, publisher-authored immutable reference for the following eight **model bytes as previously verified**, before publicly approving its optional native ASR rollout:

| Model file | Requested official file SHA-256 |
| --- | --- |
| `adapter.ort` | `16307442b7f4229f2f1511fc51b545cec9616e55872c588f3a297bbc6f4762ea` |
| `cross_kv.ort` | `354b9a955caeb768b528f447f0a36ce4b850ca7b4531900165df304d97904fba` |
| `decoder_kv.ort` | `fa67aa87521247f5bf44d3e44d4e4978e58c1f114249c3c6909c882624056715` |
| `decoder_kv_with_attention.ort` | `40919de95d08690da3a8ff6df14cf55b3220046f3b767b4a4b769e7b32aaf2d2` |
| `encoder.ort` | `a5f11167a62eef61787fe8410453257d6ddb8eba90af461a9604e5f2e93d5322` |
| `frontend.ort` | `378fe8a5d7090a1b9ab88bbb1fc95bde010cdd64ec23419350d2d23c675636e9` |
| `streaming_config.json` | `28e83b7a28e91472692a035e0dae3116422ae43aeb2bef5ed822c44ce89b88af` |
| `tokenizer.bin` | `6884b35fd6377d4c4d32336a0bc152f36b64d1e45b6503683cdc238250a8472d` |

Official Hugging Face [asset-ref API](https://huggingface.co/api/models/moonshine-ai/moonshine-voice-assets/refs) checked 2026-11-23 lists only `v0.1.5` and `v0.1.6`, and does not expose `v0.0.65`. A newer dated model catalog at [immutable commit `e3181172...`](https://huggingface.co/moonshine-ai/moonshine-voice-assets/blob/e318117203f245fda2ca0142db6b8c057d86671c/TRANSFER_REPORT.tsv), under `medium-streaming-en/quantized_26_07_30/`, matches only **two** of the eight hashes. A `FILES.tsv` entry carrying MD5/CRC32C alone is not equivalent to the SHA-256 needed for these exact files.

### 2026-11-24 version-compatibility update (request remains UNSENT)

The official [`v0.1.6` tagged native catalog](https://github.com/moonshine-ai/moonshine/blob/d8d8fa29d05ca67441a7719e70099f9f48917a93/core/moonshine-model-catalog.cpp) now chooses `medium-streaming-en/quantized_26_11_02/` and a **different file layout**: `frontend.model.ort` and `frontend.weights.ort` replace the old single `frontend.ort`, while `decoder_kv_with_attention.ort` becomes optional for word timestamps. The [official `v0.1.6` changelog](https://github.com/moonshine-ai/moonshine/blob/d8d8fa29d05ca67441a7719e70099f9f48917a93/CHANGELOGS.md) documents performance and reliability changes, but the public [current `TRANSFER_REPORT.tsv`](https://huggingface.co/moonshine-ai/moonshine-voice-assets/raw/main/TRANSFER_REPORT.tsv) checked 2026-11-24 still shows the older `quantized_26_07_30` English Medium Streaming directory and does not supply a `quantized_26_11_02` SHA-256 catalog. Neither directory resolves the exact old `quantized/` provenance gap. See the [version-migration decision and acceptance gates](MOONSHINE-VERSION-MIGRATION-DECISION-2026-11-24.md).

For question 4, please also request the **publisher-authored immutable SHA-256 file manifest, release/tag and third-party notice obligations for the v0.1.6 `quantized_26_11_02` variant**, including the conditional attention decoder. This is a request for information only; do not assume a code or model upgrade, or claim that an upstream CRC32C file manifest is an immutable SHA-256 attestation.

### Specific questions for the publisher

1. Is there an authoritative immutable commit/tag, released archive manifest or version-specific `TRANSFER_REPORT.tsv` with **all eight exact file SHA-256 values** for the `v0.0.65` `quantized/` English Medium Streaming model? If the CDN path was rewritten, please identify when and how a historic version may be recovered without guessing or silently switching files.
2. Please confirm the **precise license text and redistribution scope** applying to those eight historical English quantized model files, including whether software can initiate a **user-opt-in** download from the official CDN to the user's own local machine, with no weights shipped inside the application.
3. Which **required model/SDK attribution and third-party notices** apply to this specific version and integration, if any? Are there separate notice obligations for ONNX Runtime or the official runtime's bundled binaries? Please identify the authoritative files and versions.
4. If these old tensors are superseded or unavailable, which **versioned SDK plus matching model** is recommended as a supported replacement, and where is the corresponding versioned manifest? Voxnelo will separately test any change; no model switch is authorized by this request.

If upstream replies, record: exact source URL, revision SHA, file list and verified checksums, review date, responder/authority, license/notice texts and the scope of permission. Preserve the original response privately if necessary and link a nonidentifying summary in [Issue #123](https://github.com/kunlong-luo/voxnelo/issues/123).

**Do not interpret a successful HTTPS download or a matching CDN checksum as publisher authorization. Do not mark this gate PASS until an identified reviewer has examined the evidence and documented the release decision.** Human microphone WER/latency and install/privacy tests are separate release requirements.

## Offline/online recheck command

```bash
pnpm asr:moonshine:upstream:refs
```

This **opt-in read-only** command fetches the current official ref list plus text SHA-256 reports at exact commit SHAs. It exits with a nonzero status while `v0.0.65` or all eight matching legacy assets are missing. A future passing result **still does not** signify that model-license review, build provenance or physical microphone QA are complete. No binary model, audio, transcript or third-party account credentials are downloaded or uploaded.

Voxnelo public v1.0.3 remains separate; GitHub Release Draft `428750217` for v1.0.4 must stay `draft=true`, `published_at=null` with original assets untouched.

### 2026-11-25 independent source corroboration (request remains UNSENT)

The official GitHub **source** tag [v0.0.65](https://github.com/moonshine-ai/moonshine/tree/c09053306769543292b676c0c1e6bd55b2b6ca38) resolves directly to commit `c09053306769543292b676c0c1e6bd55b2b6ca38`. Read the exact [LICENSE](https://github.com/moonshine-ai/moonshine/blob/c09053306769543292b676c0c1e6bd55b2b6ca38/LICENSE) (Git blob `f2b06557a63284695955aba3880ee7f5dab123f3`), [README](https://github.com/moonshine-ai/moonshine/blob/c09053306769543292b676c0c1e6bd55b2b6ca38/README.md) (blob `2b7bca046b164a9dd0ab9eafdbabe84b448440c7`) and [Python downloader](https://github.com/moonshine-ai/moonshine/blob/c09053306769543292b676c0c1e6bd55b2b6ca38/python/src/moonshine_voice/download.py) (blob `7f9f1fa636573613b5cf40f120d265e6bd91bacc`). The tag explicitly declares English-language models MIT, with Section 1 attribution/notice obligations, and separately excludes core/third-party from the blanket code license. The downloader identifies the legacy quantized CDN path and conditionally adds decoder_kv_with_attention.ort. The recursive source tree returned 2102 entries and was not truncated; no path matched medium-streaming-en, decoder_kv_with_attention.ort, FILES.tsv or TRANSFER_REPORT.tsv. This is version-specific publisher license-family and path evidence, not a checksum manifest for the actual eight downloaded bytes. Distinguish the existing GitHub source tag from the missing historical Hugging Face **asset** tag. Current HF ref API could not be retrieved in this check; retain prior dated ref observation, not a new asserted ref inventory.

A separate third-party [Milkrice mirror, immutable commit 0b8af8ae18434331ab897269db81b2011a9c37a2](https://huggingface.co/milkrice/moonshine-streaming-medium-en/commit/0b8af8ae18434331ab897269db81b2011a9c37a2) claims to mirror the same legacy CDN quantized directory. Compared the model card and committed Git LFS pointer OIDs against all eight exact constants in apps/desktop/moonshineIntegrity.ts. Results:

| Pinned filename | Mirror metadata result | Declared bytes (if LFS pointer) |
| --- | --- | ---: |
| adapter.ort | SHA-256 exact match in README and LFS pointer | 3647712 |
| cross_kv.ort | exact match in README and LFS pointer | 11544952 |
| decoder_kv.ort | exact match in README and LFS pointer | 146216448 |
| decoder_kv_with_attention.ort | absent from commit and file list | — |
| encoder.ort | exact match in README and LFS pointer | 94202872 |
| frontend.ort | exact match in README and LFS pointer | 47467256 |
| streaming_config.json | exact match in README; text file present, bytes not independently hashed | — |
| tokenizer.bin | exact match in README and LFS pointer | 249974 |

Thus 7/8 published digest declarations agree, including 6/8 LFS SHA-256 pointers. The third-party mirror also carries an MIT notice. No mirror model binaries downloaded, no publisher identity/authority inferred from the mirror's verified commit indicator, no independent mirror byte rehash, no transfer of source trust or change to download URL. The exact missing attention decoder hash remains in question 1 above; a public search for that digest returned no result, not proof of global absence. The official [current transfer report](https://huggingface.co/moonshine-ai/moonshine-voice-assets/raw/main/TRANSFER_REPORT.tsv) still lists the eight files under the different dated quantized_26_07_30 directory, only 2/8 matching existing pins. Keep the original all-eight publisher-authored immutable manifest request and version-specific notice review; this corroboration narrows the investigation but does not close it. No external request sent, no upstream issue opened, no alternative mirror configured, no model pins changed. HOLD.
