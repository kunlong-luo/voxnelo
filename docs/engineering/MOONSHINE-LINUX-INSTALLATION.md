# Moonshine Linux default — installed-runtime integration

> **适用于 v0.1.5/v0.1.6 Linux x64。** v0.1.6 同时公开 Windows/macOS 安装包，但这些平台暂不提供本指南所述的本地 Moonshine Python 运行时。模型首次安装始终由用户明确点击触发；安装器并不自带模型。

Voxnelo's Linux desktop uses **Moonshine Voice Medium Streaming** as the default
offline English recognizer. There is no automatic Zipformer fallback.

## Personal model installation

In the Linux desktop application, open **离线模型管理 / Offline Models** and
choose **安装 Moonshine 离线识别模型 / Install Moonshine offline recognition**.
Installation happens only after this explicit click. It downloads the pinned
`moonshine-voice==0.0.65` Python SDK from PyPI and the model via the official
Moonshine SDK, then checks the eight fixed model-file SHA-256 hashes before the
application declares the model ready.

Prerequisites: Linux x86-64, Python 3 and its `venv` module, working network
access for the initial download, enough local disk space, and a supported
glibc/native wheel environment. Subsequent recognition does not intentionally
upload microphone audio or require a network connection.

For an explicitly opted-in development installation from a checked-out repo:

```sh
pnpm asr:moonshine:install --accept-experimental-runtime
```

The installed files live in the user's Voxnelo configuration directory:

- `moonshine/venv/bin/python` — personal Python environment
- `moonshine/model/` — fixed eight-file quantized English Medium Streaming model

The packaged application's own Python protocol scripts live under its
`resources/moonshine/scripts/` directory. No renderer-supplied executable,
model directory, or arbitrary command is accepted through IPC.

If installation or checksum verification fails, the app reports an error, does
not mark the model ready, and does not silently switch to Zipformer. The
installer never overwrites existing Moonshine data. Do not delete a personal
model directory while dictation is active.

## Release validation

- `tests/asr-default.test.ts`: single Linux default, no silent fallback
- `tests/moonshine-integrity.test.ts`: strict pinned content inventory
- `tests/moonshine-paths.test.ts`: packaged resources and per-user paths
- `tests/offline-models.test.tsx`: explicit-click installation
- `scripts/check-desktop-package.mts`: packaged scripts and opt-in launcher
- Experimental Moonshine CI: real model, isolated SDK, synthetic 16 kHz WAV and
  packaged Electron ASR event pipeline

Real Linux hardware microphone-to-subtitle latency and acoustic WER evaluation,
native dependency licenses, signed release artifacts and wider platform
support remain separate release acceptance criteria. Do not cite CI-generated
speech as a real user's microphone test.

Official license: https://github.com/moonshine-ai/moonshine/blob/main/LICENSE
English streaming model and first-party project code are MIT under the
repository's license; third-party components may carry their own terms.
