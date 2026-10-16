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

## Stage the reviewed native Node binding, not just a .node binary

Voxnelo now provides an explicit native integration command:
`pnpm asr:native:stage`. It consumes **already obtained, locally reviewed**
sources and does not perform network downloads or execute vendor code.
This makes a complete, reviewable `build/offline-asr/` release staging tree.

Review the matching **sherpa-onnx-node** package release before running this.
From the upstream package, the `lib/` wrapper directory must contain
`streaming-asr.js`, `addon.js` and `addon-static-import.js`. Supply the
separately audited `sherpa-onnx.node` file and the full set of matching
native shared libraries, flattened into their own input directory.
The tool creates a self-contained `native/index.cjs` entry and
`native/package.json` containing `{"type":"commonjs"}`. This matters
because Voxnelo itself is an ES module project while the upstream native
Node wrapper expects CommonJS `require()` relative to its own directory.

The reviewed source inventory is an **independent input**, not an integrity
manifest generated from unapproved downloaded binaries. Example
`/absolute/review.json`:

```json
{
  "platform": "linux",
  "arch": "x64",
  "modelRevision": "bfbb11950302dad9955f8ede01f0e768595e4fba",
  "modelTokensSha256": "64 lowercase SHA-256 hex characters from reviewed tokens.txt",
  "nativePackage": "sherpa-onnx-node",
  "nativeVersion": "the exact audited npm version",
  "nativeLicense": "Apache-2.0",
  "nativeSource": "a pinned upstream release URL",
  "nativeFilesSha256": {
    "streaming-asr.js": "reviewed 64-char SHA-256",
    "addon.js": "reviewed 64-char SHA-256",
    "addon-static-import.js": "reviewed 64-char SHA-256",
    "sherpa-onnx.node": "reviewed 64-char SHA-256",
    "libonnxruntime.so": "reviewed 64-char SHA-256"
  }
}
```

Include **every** shared library in the review inventory; the library names
in this example are illustrative, not instructions to guess the library list.
The tool refuses missing dependencies, mismatched checksums, symlinks,
unreviewed files, cross-platform architecture mismatches, and a destination
that already contains release assets. Stage only assets for the OS/CPU on
which the release builder is running. The original README remains intact.

```bash
pnpm asr:model:prepare
pnpm asr:native:stage \
  --model /absolute/.cache/voxnelo/offline-asr/english-zipformer/model \
  --wrapper /absolute/audited/sherpa-onnx-node/lib \
  --binary /absolute/audited/sherpa-onnx.node \
  --libs /absolute/audited/platform-shared-libraries \
  --review /absolute/review.json \
  --out /absolute/Voxnelo/build/offline-asr
pnpm asr:check-staging
pnpm pack:dir
```

The packaging integrity check independently verifies that all staged
files and manifest survive electron-builder unchanged under
`resources/offline-asr/`. **This does not verify Electron ABI, library loader
paths, signatures, redistribution permission or speech accuracy.** On macOS,
shared libraries still need reviewed codesigning and workable `@loader_path`
install names. A real streaming speech benchmark is a separate mandatory
gate for Issue #45. Never run unreviewed native files or use untrusted audio.

## Mandatory real-speech check before packaging a bundled native engine

The `pnpm pack:dir`, `pack:linux`, `pack:windows` and `pack:mac`
commands, the desktop release workflow, and CI native package checks now run
`pnpm asr:verify-real` after compiling the isolated ASR worker.

- **README-only default builds** do not include a model and skip the native
  recognition test. The UI truthfully reports that offline dictation is
  unavailable.
- **Any build with `manifest.json`** must provide two environment variables
  before producing an installer. A missing or invalid sample, native loader
  failure, empty recognition result, slow inference, or poor reference-match
  score **fails the package build**.

```bash
export VOXNELO_ASR_QA_WAV=/absolute/path/to/approved-english-test-16khz-mono-pcm16.wav
export VOXNELO_ASR_QA_EXPECT="the actual English words spoken in that test recording"
pnpm pack:dir
```

The check runs `scripts/benchmark-offline-asr.mts` with the **actual staged**
`native/index.cjs` and `model/` resources, using the worker compiled from
the current source. It requires nonempty output, real-time factor no more
than 1, and word error rate no more than 0.5. The source sample must be an
approved nonprivate testing recording, never an actual learner's voice.

This is a **minimal real-model integration gate**, not a replacement for
physical microphone testing, interruption tests, CPU/memory duration tests,
macOS signed app loader inspection, installation tests, or human license
and accessibility review. Signed/production release is blocked under
Issue #45 until those additional checks are evidenced.

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
