# Optional offline English streaming ASR — release staging

**The public repository and ordinary release build do not ship ASR binaries or
model weights.** The default desktop app must report that offline dictation is
unavailable; microphone recording/playback is independent.

Only a release maintainer may stage assets here before invoking electron-builder.
They must separately audit model and native-code licenses, redistribution rights,
platform ABI, dynamic library dependencies, and real English speech recognition.

```text
build/offline-asr/
  README.md
  model/
    encoder.onnx
    decoder.onnx
    joiner.onnx
    tokens.txt
  native/
    index.cjs           # vetted CommonJS public API adapter
    ...                 # its native .node file AND all platform shared libraries
  manifest.json         # complete, version-pinned SHA-256 file inventory
```

## Pinned English model candidate (not an installer asset)

`pnpm asr:model:prepare` downloads the English streaming Zipformer transducer
into the ignored `.cache/voxnelo/offline-asr/english-zipformer/model/` directory.
It requests an immutable upstream revision
`bfbb11950302dad9955f8ede01f0e768595e4fba`, validates full SHA-256
digests and exact byte counts for the encoder, decoder and joiner, and retains
the fixed-revision `tokens.txt` with a recorded SHA-256. Downloads stream
to temporary files and only become available after validation.

The upstream-tested model combination is an int8 encoder + FP32 decoder +
int8 joiner (not an arbitrary mix of the two decoder formats). Its expected
size is approximately 130 MB. The Hugging Face model card marks the source
Apache-2.0; independent review of model provenance, downstream dependencies,
redistribution and any notices remains required.

**This command does not enable dictation in the stock app** and does not
copy a model to `build/offline-asr/`. The native Node API adapter/binaries
still require separate platform-specific, audited preparation. Model
preparation is explicit, not a background download from a microphone UI.

Once the real native adapter is staged for an approved target and
`pnpm build` succeeds, run the real engine test (not a mock):

```bash
VOXNELO_ASR_MODEL_DIR=/absolute/path/to/model \
VOXNELO_ASR_ADDON_PATH=/absolute/path/to/native/index.cjs \
node --experimental-strip-types scripts/benchmark-offline-asr.mts \
  --wav /absolute/path/to/approved-English-16k-mono.wav \
  --expect "the spoken words in the approved test audio"
```

A successful benchmark requires a nonempty transcript, real-time factor
(RTF) no greater than 1, and (with `--expect`) word error rate no
greater than 0.5. The benchmark must use **genuine** inference results.
Passing one sample does not establish installation or real-microphone QA.

## Release integrity preflight

Before building a desktop package, `pnpm build:electron` runs
`pnpm asr:check-staging`. README-only staging passes (dictation remains
unavailable). **Any** staged model/native file requires a `manifest.json`
containing all of:

- `modelId`, `modelSource`, `modelRevision` (full 40-character upstream Git commit)
- `modelLicense`, `nativePackage`, `nativeVersion`, `nativeLicense`
- `sha256`: a map of **every** path under `model/` and `native/` to its
  64-character SHA-256 digest, including the CJS entry, .node library and
  platform DLL/dylib/so dependencies

The preflight compares all files and SHA-256 hashes, rejects missing/extra
files, symlinks and traversals, and refuses an incomplete native payload.
These checks are only **integrity controls**: copying a self-authored manifest
does not prove authenticity, model quality, binary safety, license clearance or
compatibility. All of those still require a maintainer's human release review.

## Critical native API detail

Do **not** copy only `sherpa-onnx.node` into `native/` or rename it to
`index.cjs`. The low-level native addon does **not** itself expose
`new OnlineRecognizer(config)`; that class is supplied by the
`sherpa-onnx-node` JavaScript binding. `native/index.cjs` must be a
reviewed, **self-contained, platform-specific CommonJS entrypoint** exporting
`OnlineRecognizer` from the public binding, and must resolve its actual
`.node`, `.dll`, `.dylib`, `.so` and wrapper support files **inside**
`native/`. No network downloads or access to external user-installed
packages are allowed at runtime.

On macOS do not assume that `DYLD_LIBRARY_PATH` is preserved for a signed
Electron application; resolve transitive native dependencies using reviewed
bundle-relative loader paths and validate on real signed builds. Windows x64,
macOS x64/arm64 and Linux x64/arm64 need platform-specific binaries.

The model layout above is a **streaming transducer**. Do not rename files from
an offline Whisper or a CTC model to match it. `apps/desktop/asrConfig.ts`
defines the sherpa-onnx-node `OnlineRecognizer` contract used by the worker.

Candidate for evaluation, **not approved for shipping without human review**:
[`sherpa-onnx-streaming-zipformer-en-2023-02-21`](https://huggingface.co/csukuangfj/sherpa-onnx-streaming-zipformer-en-2023-02-21)
(model card states Apache-2.0). Map the correct **matching** encoder,
decoder, joiner and tokens into the four expected names. Use the matching
model family's int8 encoder/joiner only after verifying decode quality and
compatibility. Record the exact model revision and hashes in release evidence.

Official references:
- https://k2-fsa.github.io/sherpa/onnx/javascript-api/examples/api_streaming_asr.html
- https://k2-fsa.github.io/sherpa/onnx/javascript-api/install.html
- https://github.com/k2-fsa/sherpa-onnx/issues/2622 (Electron/macOS loader concerns)

**Acceptance gate:** run actual 16 kHz PCM inference (e.g. with
`scripts/benchmark-offline-asr.mts` and an approved test WAV) on every
supported architecture. Verify meaningful interim/final text, error rate,
real-time factor, microphone permissions, CPU/memory, closed-window cleanup,
and packaged code signing. CI fake-worker tests do not satisfy this gate.

Never commit native binaries, model weights, or private microphone captures.
See Issue #45 for the release checklist.
