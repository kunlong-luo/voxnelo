#!/usr/bin/env python3
"""Local-only, opt-in Linux Moonshine PCM streaming subprocess protocol.

Used by the packaged Electron Linux app after a user installs the verified
personal Moonshine runtime; models are never bundled. Stdout is JSONL events only.
Input: one JSON object per line: {"type":"pcm","samples":[float,...]} or
{"type":"finish"}. Each PCM packet is <=3200 mono float samples at 16 kHz.
Use an isolated Python interpreter with moonshine-voice==0.0.65 installed.
No network requests, automatic downloads, or arbitrary commands.
"""
import argparse
import json
import math
from pathlib import Path
from threading import Lock
import sys

MAX_PACKET = 3200
MAX_FINAL = 8000
MAX_INTERIM = 1000
# SDK transcript callbacks may arrive from a different thread than stdin
# PCM handling. Stdout TextIOWrapper is not a thread-safe JSONL transport.
_EVENT_WRITE_LOCK = Lock()


def packet_samples(message):
    if not isinstance(message, dict) or message.get("type") != "pcm":
        raise ValueError("Invalid packet type")
    values = message.get("samples")
    if not isinstance(values, list) or not 1 <= len(values) <= MAX_PACKET:
        raise ValueError("Invalid PCM packet size")
    if any(type(x) not in (float, int) or not math.isfinite(x) or abs(x) > 1 for x in values):
        raise ValueError("Invalid PCM sample")
    return values


def emit(event):
    # Every event must be a whole line, including its flush. Interleaved
    # partial JSON breaks the Electron native worker's strict protocol and
    # stops dictation in the middle of speech.
    payload = json.dumps(event, ensure_ascii=True, separators=(",", ":")) + "\n"
    with _EVENT_WRITE_LOCK:
        sys.stdout.write(payload)
        sys.stdout.flush()


def run(model_dir):
    import numpy as np
    from moonshine_voice import ModelArch, Transcriber, TranscriptEventListener
    from importlib.util import spec_from_file_location, module_from_spec
    spec = spec_from_file_location('benchmark_moonshine_voice', Path(__file__).with_name('benchmark-moonshine-voice.py'))
    if spec is None or spec.loader is None:
        raise RuntimeError('Missing validator')
    validator = module_from_spec(spec)
    spec.loader.exec_module(validator)
    validate_model = validator.validate_model
    validate_model(str(model_dir))
    completed = []
    partial = [""]
    class Listener(TranscriptEventListener):
        def on_line_text_changed(self, event):
            value = (event.line.text or "").strip()[:MAX_INTERIM]
            if value != partial[0]:
                partial[0] = value
                emit({"type":"result","finalText":" ".join(completed)[-MAX_FINAL:],
                      "interimText":value})
        def on_line_completed(self, event):
            value = (event.line.text or "").strip()
            if value:
                completed.append(value)
                # Bound retained transcription, not just outbound events.
                while len(" ".join(completed)) > MAX_FINAL and len(completed) > 1:
                    completed.pop(0)
                partial[0] = ""
                emit({"type":"result","finalText":" ".join(completed)[-MAX_FINAL:],
                      "interimText":""})
    engine = Transcriber(model_path=str(model_dir),
                         model_arch=ModelArch.MEDIUM_STREAMING, update_interval=0.25)
    engine.add_listener(Listener())
    engine.start()
    stopped = False
    emit({"type":"ready"})
    try:
        for line in sys.stdin:
            message = json.loads(line)
            if isinstance(message, dict) and message.get("type") == "finish":
                engine.stop()
                stopped = True
                emit({"type":"result","finalText":" ".join(completed)[-MAX_FINAL:],
                      "interimText":""})
                emit({"type":"finished"})
                return
            values = packet_samples(message)
            engine.add_audio(np.asarray(values, dtype=np.float32), 16000)
            emit({"type":"drained"})
        # EOF before finish is an interrupted session, not a successful final.
        emit({"type":"failure"})
    finally:
        try:
            if not stopped:
                engine.stop()
        finally:
            close = getattr(engine, "close", None)
            if callable(close):
                close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-dir", required=True)
    args = parser.parse_args()
    try:
        root = Path(args.model_dir)
        if not root.is_absolute() or root.is_symlink() or not root.is_dir():
            raise ValueError("Invalid model directory")
        run(root)
    except (ValueError, KeyError, TypeError, RuntimeError, ImportError, OSError):
        # No paths, PCM, or recognized text in diagnostics.
        emit({"type":"failure"})
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
