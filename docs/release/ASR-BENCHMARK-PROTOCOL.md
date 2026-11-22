# Offline ASR reproducible benchmark protocol

This file defines measurement methodology only; no benchmark has been executed as part of this document change.

## Test corpus

Use licensed or consented English recordings with human-verified verbatim references. Keep private audio outside the repository. Record corpus version and checksum, sample rate, duration, speaker/accent distribution, speaking style, room noise, playback device and microphone. Include clean speech, background noise, connected speech, long utterances and interrupted sessions. Disclose any exclusion and never mix synthetic fixtures with real acoustic results.

## Reproducibility

Record app commit, OS version and architecture, Moonshine SDK/model versions and model checksum, CPU/RAM, audio path, input device, inference settings, warm-up policy and offline/network state. Run identical corpus for each model, with repeated runs for latency and memory.

## Metrics

WER = (substitutions + deletions + insertions) / reference word count; CER uses characters. Document normalization rules (case, punctuation, contractions, numbers) before scoring. Report median/p95 time-to-first-text, finalization latency, real-time factor, CPU and peak RSS, alongside failures and sample counts. Report distributions by noise/accent group and confidence intervals when justified. Keep empty results as NOT MEASURED. For local WAV batches, the expected sample-ID/decoder plan must be fixed before inference; each planned pair must have exactly one success or explicit failure. Reject duplicated, missing, substituted or scenario-mismatched results even when the total result count looks correct. Reject nonfinite WER/RTF/duration, invalid reference/error counts and inconsistent WER arithmetic before grouping. The private WAV harness also requires a structurally consistent 16 kHz mono PCM16 RIFF container (matching total length, only one `fmt ` and one `data` chunk, correct byte rate/block alignment), checks the native model's reported audio duration against the WAV sample count, and verifies RTF is compatible with elapsed time **accounting for documented rounding**. Failed consistency checks count as failed evaluations, not high-quality recognition. An incomplete report is diagnostic evidence, never a release pass. Synthetic regression tests may exercise these rejection paths, but do not generate acoustic quality evidence.

## Acceptance

Publish thresholds only after product-owner approval and representative hardware testing. A green CI synthetic test is not a measured accuracy or performance claim. Refer to [ASR accuracy experiments](../engineering/ASR-ACCURACY-EXPERIMENTS.md) for existing experiments.
