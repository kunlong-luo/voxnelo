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

1. In an isolated Python environment, install a reviewed compatible moonshine-voice Python SDK version. Explicitly opt in to the upstream model download with the official Moonshine CLI command: moonshine-voice download --stt --language en. Save the model revision, SDK version, SHA-256 file hashes and upstream licenses in a private QA log. Model download MUST NOT happen silently when Voxnelo starts. Pin model bytes and audit third-party libraries before any app integration.
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

The Python candidate uses the official Transcriber streaming interface: starts fresh, feeds 800 PCM samples (=50ms @16kHz) each call, captures LineTextChanged interim and LineCompleted final callbacks. It returns a model-first-interim audio fed measure, **not** display latency. The candidate SDK and model must be installed before this command; CI checks only input validation and scoring without downloading binary artifacts.

## Do-not-switch promotion gate

- Same-device, same-WAV weighted WER across user-approved human close-talk, replay speaker, different English accents and noise. Meaningful improvement without unacceptable regressions is required.
- Measure actual Linux CPU, memory, cold model startup, RTF (<1 needed for sustained streaming), interim-word cadence and end-of-speech handling. Protect the user's already validated low-latency experience.
- Implement a separately verified Moonshine streaming worker (Moonshine API is not sherpa's OnlineRecognizer), opt-in download/checksum management and explicit rollback to the user's verified existing engine.
- Include package signing, transitive dependency/third-party license audit, legitimate redistribution rights, and Linux/Windows/macOS physical device QA before marking stable.
- Keep #117 (accuracy) and #45 (release) open. A vendor benchmark, demo CLI or green contract-only CI is not evidence of quality on the user's Linux microphone.