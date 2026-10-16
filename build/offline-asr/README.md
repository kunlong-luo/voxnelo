# Optional offline speech engine (release staging)

This folder is copied to the Electron application's `resources/offline-asr/` directory.

**No model or native executable is shipped in the public repository.**
Voxnelo will report offline dictation unavailable until a release maintainer
has completed license, signature, native ABI and actual speech QA checks,
then staged these files *before* packaging:

- `native/sherpa-onnx.node` — audited Node native addon for the target OS/CPU.
- `model/encoder.onnx`
- `model/decoder.onnx`
- `model/joiner.onnx`
- `model/tokens.txt`

These model filenames correspond to a streaming transducer. Other model
architectures require adapter updates, not renaming unrelated model files.

Do not commit model weights or native binaries to Git by default.
Do not download arbitrary executables from the UI or accept paths from IPC.
Electron packaging copies the contents present in this directory at build time.
See Issue #45 for the release-blocking, real-device validation requirements.
