# Voxnelo — Moonshine Streaming English ASR Evaluation

**Status:** experimental developer-only comparison; NOT yet an Electron backend, user download, installer payload, or release approval.

## Choice and evidence

Primary candidate: Moonshine Voice English **Medium Streaming** (245M parameters; MIT English model; publisher-reported 6.65% mean WER across 8 Open ASR datasets using floating-point reference). For slower CPUs compare **Small Streaming** (123M; publisher-reported 7.84%). Official streaming C++ and JavaScript/WASM SDKs exist for later Windows/Linux/macOS integration. Quantized model WER may be worse than the floating-point headline.

Current working Linux engine is the pinned sherpa-onnx 2023-02-21 streaming Zipformer; in the existing CI its one synthetic 4-word sample scored 50% WER with both greedy and modified beam decoding. **These WERs are from different datasets and cannot be compared directly to select a winner.**

Other candidates: 2023-06-26 streaming Zipformer (lowest migration effort, same sherpa API); NVIDIA Parakeet TDT 0.6B (larger CPU and new streaming engine demands); Whisper Large (heavy and not genuinely streaming). Prioritize Medium, Small fallback, and keep old engine until paired testing proves improvement.

Sources:
- https://github.com/moonshine-ai/moonshine
- https://moonshine-voice.readthedocs.io/en/latest/models/available-models/
- https://moonshine-voice.readthedocs.io/en/latest/using/transcription/
- https://moonshine-voice.readthedocs.io/en/latest/using/downloading-models/
- https://moonshine-voice.readthedocs.io/en/latest/license/

## Private local A/B pilot

1. In an isolated Python environment, use the actual CI-tested pinned SDK version `moonshine-voice==0.0.65`. Its Python-module download entrypoint is `python -m moonshine_voice.download --stt --language en --root /absolute/local/cache` (the newer `moonshine-voice` command is **not** installed by SDK v0.0.65). Explicitly opt in to downloading; record the SHA-256 hashes and upstream licenses. Model download MUST NOT happen silently when Voxnelo starts. Pin **all** model weights and native wheels before app integration.
2. Keep the Moonshine model outside Voxnelo's verified offline-asr personal directory: its .ort components are **incompatible** with the legacy sherpa-onnx OnlineRecognizer CJS addon. Never overwrite a working model with these files.
3. Use the same **locally stored, consented** 16kHz mono PCM16 WAV clips (max 180 seconds) and exact spoken English text for all engines. Include at least 30 representative phrases across close-talk, external speaker playback and noisy audio. Do NOT upload human audio or transcripts to CI or GitHub Issues.
4. Put samples in an absolute private JSON manifest such as:

    {"samples":[
      {"id":"quiet01","scenario":"quiet","wav":"quiet/one.wav","reference":"Please speak English slowly"},
      {"id":"speaker01","scenario":"noise","wav":"speaker/one.wav","reference":"Please speak English slowly"}
    ]}

5. In the local developer environment only, set absolute paths VOXNELO_ASR_MODEL_DIR and VOXNELO_ASR_ADDON_PATH for the existing verified Sherpa pilot, and VOXNELO_MOONSHINE_MODEL_DIR for the separate local Moonshine model. Run:

    pnpm asr:compare:moonshine --manifest /absolute/private/samples.json --output-dir /absolute/new-private-report

Choose Small Streaming by adding --moonshine-size small and pointing VOXNELO_MOONSHINE_MODEL_DIR at **Small** weights. The runner calls python3 by default; set VOXNELO_MOONSHINE_PYTHON to an isolated environment Python executable when needed. It installs/downloads nothing itself and does not change any Voxnelo runtime setting.

Scores and diagnostics: for each exact same WAV, the existing two Sherpa decoders and the specified Moonshine streaming candidate are run separately, weighted WER equals sum of substitutions/deletions/insertions divided by reference word total. Report RTF separately, including failed attempts. JSON/Markdown reports stay outside the Git checkout and contain only sample IDs and numeric metrics, never WAV filenames, text, recognized transcripts, or native paths. If an attempt fails, the entire comparison is marked INCOMPLETE.

The Python candidate uses the official Transcriber streaming interface: starts fresh, feeds 800 PCM samples (=50ms @16kHz) each call, captures LineTextChanged interim and LineCompleted final callbacks. It returns a model-first-interim audio fed measure, **not** display latency. The candidate SDK and model must be installed before this command; Ordinary app CI checks only input validation and scoring without downloading binaries. A separate experimental workflow explicitly downloads models in a disposable CI sandbox and runs full real inference; it never uploads those model binaries.

## Real Linux model-to-model evidence (2026-10-21)

PR #120 / [experimental run 39530848953](https://github.com/kunlong-luo/voxnelo/actions/runs/39530848953) **passed with the actual English Medium Streaming quantized Moonshine .ort model** and the current pinned Sherpa Zipformer 2023-02-21 model. The *same three non-user espeak-generated English WAV clips*, 18 total reference words, produced:

| Model + decoder | Substitutions | Deletions | Insertions | Weighted WER | Aggregate RTF |
| --- | ---: | ---: | ---: | ---: | ---: |
| Existing Zipformer greedy | 2 | 10 | 0 | 66.67% | 0.3629 |
| Existing Zipformer modified beam | 3 | 6 | 0 | 50.00% | 0.3724 |
| Candidate Moonshine Medium Streaming (quantized) | 0 | 0 | 0 | **0%** | 0.4494 |

This is a **genuine matched-input** test, much more informative than cross-comparing unrelated published WER leaderboards. However, 18 words and synthetic voices are **far too small to establish real-device generalization**. These RTF values are offline CI throughput, not Linux microphone first-subtitle latency. This is a strong reason to build a reversible local Moonshine pilot, not justification to automatically replace the user's working engine or mark #117 completed.

SHA-256 example *partial provenance* from that run (quantized files under the English Medium Streaming model cache):

- `encoder.ort`: `a5f11167a62eef61787fe8410453257d6ddb8eba90af461a9604e5f2e93d5322`
- `decoder_kv.ort`: `fa67aa87521247f5bf44d3e44d4e4978e58c1f114249c3c6909c882624056715`
- `tokenizer.bin`: `6884b35fd6377d4c4d32336a0bc152f36b64d1e45b6503683cdc238250a8472d`

**These three hashes do not secure the whole model.** Other .ort files, config, third-party shared libraries and Python dependencies still need a complete, verified and signed inventory. Model downloads in the CI are deliberately disposable and not published to app users.

## Do-not-switch promotion gate

- Same-device, same-WAV weighted WER across user-approved human close-talk, replay speaker, different English accents and noise. Meaningful improvement without unacceptable regressions is required.
- Measure actual Linux CPU, memory, cold model startup, RTF (<1 needed for sustained streaming), interim-word cadence and end-of-speech handling. Protect the user's already validated low-latency experience.
- Implement a separately verified Moonshine streaming worker (Moonshine API is not sherpa's OnlineRecognizer), opt-in download/checksum management and explicit rollback to the user's verified existing engine.
- Include package signing, transitive dependency/third-party license audit, legitimate redistribution rights, and Linux/Windows/macOS physical device QA before marking stable.
- Keep #117 (accuracy) and #45 (release) open. A vendor benchmark, demo CLI or green contract-only CI is not evidence of quality on the user's Linux microphone.