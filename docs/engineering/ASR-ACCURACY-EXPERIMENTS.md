# Voxnelo 0.1.5 — Local ASR accuracy experiments (not a release claim)

## Evidence status

On 2026-10-19 the project owner reported that personally installed, local real-time dictation **runs on their device**, but recognition accuracy needs improvement. This establishes a qualitative local usability report, **not** a measured WER, official hardware acceptance, or redistribution permission. GitHub Issue [#45](https://github.com/kunlong-luo/voxnelo/issues/45) remains OPEN.

Previous pinned-model CI recognition produced WER 0.50 on one generated speech sample (not human speech). This cannot be extrapolated to learners or to noisy rooms.

## Candidate: audio front-end

The first experimental quality change band-limits captured 44.1/48/96 kHz audio before 16 kHz ASR delivery instead of applying only linear interpolation. This prevents high-frequency device noise from aliasing into the model's speech band. It also downmixes all device channels rather than silently dropping a speaker recorded on channel 2. Sampling remains real microphone PCM, fully local. Device echoCancellation / noiseSuppression / autoGainControl are still **requests**, not proof of effective environmental noise removal.

New tests cover constant signal sample counts, stereo speech, 1 kHz passband, 12 kHz alias attenuation, and 128-frame quantum continuity. These are **signal-path tests**, not evidence of a better real-world word error rate. Physical microphone A/B testing is still required.

## Candidate: compare decoding methods without switching everyone

The same sherpa-onnx online transducer supports `greedy_search` (the existing, unchanged production default) and `modified_beam_search` with `maxActivePaths: 4`. The latter can change transcription accuracy, latency, and CPU usage. **Do not label it better without matched WAV evidence.** The alternative is currently wired **only to the private benchmark Worker**; it is not a default UI control or a redistributed model.

Official upstream Node API: https://k2-fsa.github.io/sherpa/onnx/javascript-api/examples/api_streaming_asr.html

### Reproducible local A/B (Linux x64 personal pilot)

Use a **non-sensitive, consented test WAV** containing an English sentence you know in advance. Do not record or upload someone else's speech without permission. Keep the WAV locally; do not attach audio or a full filesystem path to GitHub issues. The benchmark accepts only 16 kHz, mono, PCM16 WAV.

From the current Voxnelo checkout (no reinstallation or deletion of existing ASR models):

```bash
pnpm install --frozen-lockfile
pnpm build:electron
ASR_ROOT="${XDG_CONFIG_HOME:-$HOME/.config}/voxnelo/offline-asr"
export VOXNELO_ASR_MODEL_DIR="$ASR_ROOT/model"
export VOXNELO_ASR_ADDON_PATH="$ASR_ROOT/native/index.cjs"

node --experimental-strip-types scripts/benchmark-offline-asr.mts \
  --wav "/absolute/path/to/test-16k-mono.wav" \
  --expect "please speak English slowly" \
  --decoding-method greedy_search --report-only

node --experimental-strip-types scripts/benchmark-offline-asr.mts \
  --wav "/absolute/path/to/test-16k-mono.wav" \
  --expect "please speak English slowly" \
  --decoding-method modified_beam_search --report-only
```

Replace both the WAV path and expected text with **exactly the sentence spoken**. Do not use a different recording between the two methods. `--report-only` is for local diagnostics only; it bypasses the benchmark's failure threshold so poor WER is visible. The CI benchmark still applies its original quality gate.

Use at least 10 previously chosen ordinary sentences in quiet conditions and repeat the same set with background noise. Keep a simple local table:

| Test | Decoder | Reference | Recognized text | WER | Real-time factor |
| --- | --- | --- | --- | --- | --- |
| #1 | greedy | (short, non-sensitive phrase) | (actual output) | (measured) | (measured) |
| #1 | beam / 4 paths | (same phrase) | (actual output) | (measured) | (measured) |

WER is the number of substitutions + deletions + insertions divided by reference words. Report average WER weighted by total reference words, **not** just the average of individual WER percentages. Compare real-time factor and responsiveness too. For personal feedback, sharing just a couple of non-sensitive expected/recognized *text* pairs is sufficient; do not share raw voice audio.

Only change the **production decoder** after paired WER and latency testing shows an advantage across multiple real speakers and hardware configurations. If decoding improves but speed falls below practical real-time use, keep the existing default.

## Still required before closing #45

- Real-device PCM→partial/final transcription checks, sustained sessions, permission/track loss, headset vs built-in microphone and measured noise outcomes.
- A verified measurement set, rather than a single generated WAV or an anecdote.
- Legal model/native-runtime redistribution review, per-platform packaging/ABI checks, Windows/macOS/Linux tests and signing.
- Honest status: publicly distributed packages still do not include the personal native engine/model.
