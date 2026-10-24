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

## Batch comparison with measured evidence (new)

Run the same recordings through BOTH decoders instead of choosing favorable examples. A real microphone is required for an eventual human recognition-quality claim; a synthetic CI fixture is only a wiring check.

1. Save **local, consented and non-sensitive** English test WAVs as **16 kHz, mono, 16-bit PCM**. Record at least ten distinct sentences under quiet conditions; re-test the same short sentences in background noise. Do not record another person without their permission. Verify the reference is what you actually said, not what the recognizer returned.
2. Create a private JSON manifest **outside the Git repository**, for example `$HOME/private-asr-tests/samples.json`. Each ID must be unique, scenarios are `quiet` or `noise`, and paths may be absolute or relative to the manifest:
   
   ```json
   {
     "samples": [
       {"id": "q01", "scenario": "quiet", "wav": "quiet-01.wav", "reference": "Please speak English slowly"},
       {"id": "n01", "scenario": "noise", "wav": "noise-01.wav", "reference": "Please speak English slowly"}
     ]
   }
   ```

3. Use the locally installed, opt-in personal Linux ASR. **Do not reinstall/remove an existing model to run this comparison.**

   ```bash
   pnpm build:electron
   ASR_ROOT="${XDG_CONFIG_HOME:-$HOME/.config}/voxnelo/offline-asr"
   export VOXNELO_ASR_MODEL_DIR="$ASR_ROOT/model"
   export VOXNELO_ASR_ADDON_PATH="$ASR_ROOT/native/index.cjs"

   pnpm asr:batch \
     --manifest "$HOME/private-asr-tests/samples.json" \
     --output-dir "$HOME/voxnelo-private-evaluation-01"
   ```

4. Read `report.md` or `report.json` in that **new, private output directory**. The command compares `greedy_search` and `modified_beam_search` against the exact same WAVs. The outputs contain only scenario, sample ID, S/D/I counts, WER and real-time factor—not spoken text, original audio, native paths or private WAV locations. Reports are created with user-only file permissions (on POSIX systems). A failed WAV or native inference makes the report `incomplete` and exits nonzero; do not use partial totals to pick a winner. The command will refuse overwriting a previous output folder.

The metric is **weighted** WER = (all substitutions + deletions + insertions) / all reference words in the scenario, NOT the average percentage of the individual sentence WERs. RTF is total elapsed inference time / total audio duration (the benchmark includes model startup for each item). Keep recording conditions and model revision constant between comparisons.

**Important interpretation:** The batch tool reports offline WAV inference performance. It does **not** measure first live subtitle time, final text after release, real-time microphone DSP, device disconnect or 10-minute stability; those need the separate real-device checklist. The `--report-only` path used for diagnostics is deliberately separate from the existing strict real-model CI quality gate. Batch reports cannot authorize Release publication or override the redistribution licensing review.

## Moonshine-only private assessment: external-speaker accuracy (2026-10-24)

Linux v1.0.1 defaults to Moonshine Medium Streaming; users **do not need to install Zipformer**
to measure their personal Moonshine model. Issue #123 remains open until physical
acoustic WER and wider platform evidence exist.

1. With consent, record at least **20 known-reference English sentences** across
   `quiet` (close mic), `external-playback` (the same English material played
   by another device into the Voxnelo microphone), and `noise` (background noise).
   Keep mic WAVs private; note speaker distance/volume, mic type, and whether
   the **External playback** capture profile was used.
2. Include `"scenario":"external-playback"` for second-device microphone
   recordings in the private JSON manifest. Accepted alternatives remain
   `quiet` and `noise`. WAVs must be 16 kHz mono PCM16 and consented.
3. Reuse the already installed *personal* Moonshine runtime/model:

   ```bash
   export VOXNELO_MOONSHINE_PYTHON="${XDG_CONFIG_HOME:-$HOME/.config}/voxnelo/moonshine/venv/bin/python"
   export VOXNELO_MOONSHINE_MODEL_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/voxnelo/moonshine/model"
   pnpm asr:batch \
     --manifest "$HOME/private-asr-tests/samples.json" \
     --output-dir "$HOME/voxnelo-private-moonshine-evaluation-01" \
     --moonshine-only
   ```

The `--moonshine-only` option runs **one real Medium Streaming inference per
private WAV**, without legacy Sherpa native paths, automatic downloads, or
changes to the application's default engine. You may use `--moonshine-size small`
if that smaller model was already separately installed. The existing
`--compare-moonshine` mode remains for optional matched-model comparisons.

Reports contain only numeric weighted WER, S/D/I counts, RTF and non-sensitive
sample IDs, grouped by scenario; they exclude audio, transcripts and full
paths. Failed model attempts mark results INCOMPLETE; `releaseReady` remains
false. This offline WAV test is **not** microphone-to-subtitle latency or real
physical-device acceptance. Do not attach private recordings to GitHub.

## Stop-boundary PCM correctness (2026-10-19)

A separate source-level review identified a potential source of short-word errors: the renderer had sent only complete 100 ms / 1600-sample AudioWorklet buffers, then disconnected the worklet immediately on Stop. This could discard up to 99.9 ms of the user's **last syllable**. The stop path now requests the worklet's partial audio tail, forwards it to the same native ASR session, waits for a FIFO `flushed` acknowledgement, and only then sends the native `finish` command. The user's real microphone track is stopped immediately; the extra worklet wait is capped at 350 ms in case a device is lost or the worklet is unresponsive.

Regression tests check: exact 320-sample remainder, no invented padding/silence, no duplicate bytes, queued PCM before native finish, timeout cleanup, and repeated stop. This fixes a *possible truncation mechanism*, **not a measured WER increase**.

For real-device follow-up, include several short sentences ending in weak consonants or reduced words (for example, `I want it`, `Please stop`). Compare complete final transcripts and approximate stop-to-final delay with prior builds; do not upload raw voice audio. If results regress, record OS/voice device category and transcript text, and roll back this audio behavior before release.

## Native ASR end-of-input decode completeness (2026-10-19)

Code review identified a separate **potential truncation mechanism**, downstream of the AudioWorklet tail flush: `offlineAsrWorker.ts` decoded at most **64 ready frames** on every invocation, including after calling `stream.inputFinished()`. If the streaming decoder had more than 64 ready frames at Stop (for example, a slow processor catching up with queued speech), `finished` could be emitted even though frames remained, with missing final words.

- For ordinary 100-ms microphone packets, the 64-step fairness budget is **unchanged**. At end-of-input only, the worker now drains until the recognizer reports no more ready frames, with an upper safety bound of **4096 steps**. This work stays off the Electron main/UI threads.
- If the final decoder remains ready after the upper bound, the worker emits a **failure** instead of a falsely complete `finished` transcript. The existing 8-second native shutdown fallback still prevents indefinite waiting. This is not a new model, online provider, decoder selection, noise filter or recognition-quality threshold.
- Unit tests simulate 190 ready frames (>64), a decoder that never drains, an empty stream and exact budget boundaries. These are correctness checks for finalization, **not a measured improvement to speech WER or latency**.
- If the live engine falls behind its 20-chunk pending-PCM budget, the Electron UI now surfaces a distinct Chinese/English **device overload** message with a retry suggestion, instead of presenting a generic engine failure. Native failure causes and voice content are not exposed to the browser UI. A failed native session (including microphone loss) must **never upgrade an earlier partial recognition to completed text**, even if the stop request returns that last fragment; this differs from a successful user-requested Stop.

**Required physical follow-up:** Using already installed personal offline ASR, compare short and long sentences in quiet conditions with Stop triggered immediately after the last word; record final text, missing last words, approximate Stop-to-final delay and any overload error. Use the same conditions when comparing previous and current builds. For an overloaded device, check whether closing CPU-heavy applications helps; do not assume more decoder iterations improve recognition on slow hardware. Use [the private batch assessment above](#batch-comparison-with-measured-evidence-new) for matched WAV metrics. No personal recording needs to be uploaded.

## Explicitly verified final transcript (2026-10-19)

A later main-process inspection found that the 8-second finish grace, native Worker failure, and invalid/stale ASR session paths previously returned `{finalText: lastText}` even when the Worker **never sent `finished`**. This could mislabel a cached earlier interim/partial phrase as the final recognized sentence on a normal user Stop. The previous renderer error callback was already unsubscribed during normal close, so the user might see no meaningful explanation.

- Native session `stop` now returns `{finalText,completed}`. Only a Worker-confirmed `finished` can set `completed:true`. All other closure paths (error, overload, owner close, invalid session, 8-second grace) return `{finalText:'',completed:false}`. No raw audio, system paths or partial captions are sent back as a successful final result.
- The renderer retains confirmed final results after a normal Stop. For an incomplete normal Stop it clears the finished transcript and shows a localized **recognition did not finish** notice; an expected cancellation/sentence switch does not show a false error. Existing overload/permission/device failures keep their separate handling.
- Unit tests cover real Worker event ordering for success, failure after partial result, timeout and delayed messages. Packaged Linux Electron's real native ASR IPC smoke now explicitly asserts `completed:true` in addition to the recognized words.
- This addresses **trustworthiness** of the completion state. It does *not* establish improved human WER, model accuracy, audio capture quality or permission for native redistribution. Keep #45 open until real microphone and legal checks.

## Still required before closing #45

- Real-device PCM→partial/final transcription checks, sustained sessions, permission/track loss, headset vs built-in microphone and measured noise outcomes.
- A verified measurement set, rather than a single generated WAV or an anecdote.
- Legal model/native-runtime redistribution review, per-platform packaging/ABI checks, Windows/macOS/Linux tests and signing.
- Honest status: publicly distributed packages still do not include the personal native engine/model.
