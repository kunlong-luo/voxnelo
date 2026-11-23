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
