#!/usr/bin/env python3
"""Explicit, local-only Moonshine streaming candidate: does not download models.

Candidate evaluation is intentionally separate from packaged Electron ASR.
Use an already installed Moonshine Voice Python SDK and model directory. The
single-result JSON is consumed locally by the same scored WAV batch harness
as sherpa-onnx. Never upload personal voice or transcripts to CI.
"""
import argparse
import json
import os
from pathlib import Path
import sys
import time
import wave

REQUIRED_MODEL_FILES = (
    "encoder.ort", "adapter.ort", "cross_kv.ort", "decoder_kv.ort",
    "streaming_config.json", "tokenizer.bin",
)
CHUNK_SAMPLES = 800  # The same 50ms @ 16kHz packet as Voxnelo's AudioWorklet.


def validate_model(directory: str) -> Path:
    root = Path(directory)
    if not root.is_absolute() or root.is_symlink() or not root.is_dir():
        raise ValueError("Provide an existing absolute, non-symlink local model directory")
    for filename in REQUIRED_MODEL_FILES:
        item = root / filename
        if not item.is_file() or item.is_symlink() or item.stat().st_size == 0:
            raise ValueError("Missing or invalid local Moonshine model component")
    # Current quantized streaming models split the frontend into model+weights.
    # A standalone frontend.ort is only valid for the older single-file layout.
    standalone = root / "frontend.ort"
    split = (root / "frontend.model.ort", root / "frontend.weights.ort")
    def valid_component(file):
        return file.is_file() and not file.is_symlink() and file.stat().st_size > 0
    if not (valid_component(standalone) or all(valid_component(file) for file in split)):
        raise ValueError("Missing or incomplete local Moonshine model frontend")
    return root


def validate_wav(filename: str) -> tuple[bytes, int]:
    source = Path(filename)
    if not source.is_absolute() or not source.is_file() or source.is_symlink():
        raise ValueError("Provide an existing absolute, regular WAV file")
    if source.stat().st_size > 7_000_000:
        raise ValueError("Reference WAV is too large")
    with wave.open(str(source), "rb") as audio:
        if (audio.getnchannels() != 1 or audio.getframerate() != 16000
                or audio.getsampwidth() != 2 or audio.getcomptype() != "NONE"
                or not 0 < audio.getnframes() <= 16000 * 180):
            raise ValueError("Expected 16 kHz mono PCM16 WAV lasting <=180s")
        frames = audio.getnframes()
        pcm = audio.readframes(frames)
        if len(pcm) != frames * 2:
            raise ValueError("Truncated WAV data")
        return pcm, frames


def evaluate(pcm: bytes, frame_count: int, model_dir: Path, size: str) -> dict:
    # Imports are lazy: --validate-only performs only static local checks.
    # No SDK installation, download, or network activity is initiated here.
    import numpy as np
    from moonshine_voice import ModelArch, Transcriber, TranscriptEventListener

    arch = ModelArch.MEDIUM_STREAMING if size == "medium" else ModelArch.SMALL_STREAMING
    completed: list[str] = []
    progress = {"fed": 0, "first": None, "first_wall": None, "started": None}
    class Listener(TranscriptEventListener):
        def on_line_text_changed(self, event):
            text = (event.line.text or "").strip()
            if text and progress["first"] is None:
                progress["first"] = progress["fed"]
                # Wall-clock delay includes synchronous inference during audio feed.
                # It is distinct from the amount of audio submitted so far.
                if progress["started"] is not None:
                    progress["first_wall"] = time.perf_counter() - progress["started"]

        def on_line_completed(self, event):
            text = (event.line.text or "").strip()
            if text:
                completed.append(text)

    load_start = time.perf_counter()
    engine = Transcriber(model_path=str(model_dir), model_arch=arch,
                         update_interval=0.25)
    engine.add_listener(Listener())
    model_load_ms = (time.perf_counter() - load_start) * 1000
    started = time.perf_counter()
    progress["started"] = started
    engine.start()
    try:
        wave_samples = np.frombuffer(pcm, dtype="<i2").astype(np.float32) / 32768.0
        for offset in range(0, frame_count, CHUNK_SAMPLES):
            part = wave_samples[offset:offset + CHUNK_SAMPLES]
            progress["fed"] = offset + len(part)
            engine.add_audio(part, 16000)
    finally:
        engine.stop()
        close = getattr(engine, "close", None)
        if callable(close):
            close()
    elapsed = time.perf_counter() - started
    duration = frame_count / 16000
    return {
        "realModel": True,
        "engine": "moonshine-voice",
        "decodingMethod": "moonshine-" + size + "-streaming",
        "durationSeconds": round(duration, 2),
        "elapsedSeconds": round(elapsed, 2),
        "realTimeFactor": round(elapsed / duration, 3),
        "modelLoadMs": round(model_load_ms, 1),
        "firstInterimAudioSeconds":
            None if progress["first"] is None else round(progress["first"] / 16000, 3),
        # This is callback latency in the fast-fed offline benchmark, not
        # end-to-end microphone-to-rendered-subtitle latency on a real device.
        "firstInterimWallMs":
            None if progress["first_wall"] is None else round(progress["first_wall"] * 1000, 1),
        "transcript": " ".join(completed),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Private Moonshine candidate evaluator")
    parser.add_argument("--wav", required=True)
    parser.add_argument("--model-dir", required=True)
    parser.add_argument("--size", choices=("medium", "small"), default="medium")
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args()
    try:
        model_dir = validate_model(args.model_dir)
        pcm, frames = validate_wav(args.wav)
        if args.validate_only:
            print(json.dumps({"valid": True, "durationSeconds": round(frames / 16000, 2),
                              "engine": "moonshine-voice", "size": args.size}))
            return 0
        result = evaluate(pcm, frames, model_dir, args.size)
        print(json.dumps(result))
        return 0
    except (ValueError, OSError, ImportError, RuntimeError, AttributeError) as error:
        # Do not print absolute private WAV/model paths or actual speech.
        print("Private Moonshine evaluation failed (" + type(error).__name__ + "). "
              "Check local model inventory, SDK, WAV and CPU compatibility.", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
