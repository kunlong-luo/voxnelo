# ASR quality baseline protocol (no measurements claimed)

Updated 2026-11-16. Read with [ASR accuracy experiments](ASR-ACCURACY-EXPERIMENTS.md) and [cross-platform pilot](MOONSHINE-CROSS-PLATFORM-PILOT.md). This protocol does not establish a passing WER, hardware acceptance or a release threshold.

## Measurement dimensions

| Metric | Definition | Evidence |
| --- | --- | --- |
| Weighted WER | Sum of substitutions, deletions and insertions / total reference words | Per-scenario counts; do not average sentence WER |
| RTF | Total inference elapsed time / total audio duration | State whether startup is included |
| First partial latency | Microphone speech onset → first nonempty subtitle | Timestamped real-device observation |
| Final latency | Last speech sample / stop → stable final subtitle | Timestamped real-device observation |
| Stability | Dropped frames, crashes, CPU/RAM after 10 and 30 minutes | OS, architecture, mic and model revision |
| Robustness | Quiet, background noise, second-device playback, mic disconnect, permission denied | Same reference list and documented conditions |

## Reproducible plan

1. Record consented, non-sensitive material locally; never commit WAVs, private transcripts or device identifiers.
2. Select at least 20 reference sentences in advance, and measure quiet, noise and external-device playback separately. Use multiple speakers and hardware before claiming general accuracy.
3. Keep WAV format at 16 kHz mono PCM16 for the existing batch tool; do not silently resample or alter reference text between candidates.
4. Run the existing `pnpm asr:batch --manifest <private-manifest> --output-dir <new-private-directory> --moonshine-only` workflow on a supported locally installed model. See the linked experiments guide for manifest structure and platform/runtime prerequisites.
5. Preserve aggregated WER, RTF and failed-case counts. The batch tool rejects inconsistent WAV RIFF framing, mismatched sample-count-to-model duration, and reported RTF incompatible with elapsed time (within the benchmark's documented rounding). A failed run is **incomplete**, not a zero-error result. Compare model/decoder changes on identical files. These guards cannot verify who spoke, microphone setup, consent, or the actual live end-to-end latency.
6. Separately capture live subtitle onset/final latency with physical microphones; offline batch inference does **not** measure live UI latency.
7. Repeat across Windows x64, macOS 15+ ARM64 and Linux x64 only where the relevant model runtime is actually installed and supported; record unsupported combinations explicitly.
8. Document chosen release thresholds **before** interpreting results. Until approved thresholds and real measurements exist, state **not measured / not accepted**.

## Private results template

| OS / CPU | Model version | Microphone | Scenario | N sentences | Reference words | S / D / I | Weighted WER | RTF | First / final latency | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Not measured | Not measured | Not measured | quiet/noise/external | — | — | — | — | — | — | Pending |

The above template is intentionally empty. CI synthetic PCM tests, three-platform packaging and qualitative user reports must not be presented as physical-device acoustic measurements.
