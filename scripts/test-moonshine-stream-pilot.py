"""Pure protocol tests: do not download the SDK/model or touch a microphone."""
import importlib.util
import json
from pathlib import Path
import threading
import time
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).with_name("moonshine-stream-pilot.py")
spec = importlib.util.spec_from_file_location("moonshine_stream_pilot", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class TestPackets(unittest.TestCase):
    def test_valid_packet(self):
        self.assertEqual(module.packet_samples({"type":"pcm","samples":[0.0,-1,1]}),
                         [0.0,-1,1])

    def test_fail_closed(self):
        invalid = [
            {}, [], None, {"type":"pcm","samples":[]},
            {"type":"pcm","samples":[0] * 3201},
            {"type":"pcm","samples":[float("nan")]},
            {"type":"pcm","samples":[float("inf")]},
            {"type":"pcm","samples":[1.01]},
            {"type":"pcm","samples":[True]},
            {"type":"finish","samples":[0.1]},
        ]
        for candidate in invalid:
            with self.subTest(candidate=repr(candidate)[:30]):
                with self.assertRaises(ValueError):
                    module.packet_samples(candidate)

class YieldingEventSink:
    """Deliberately splits JSON writes to reproduce concurrent stdout races."""

    def __init__(self):
        self.chunks = []

    def write(self, payload):
        middle = len(payload) // 2
        self.chunks.append(payload[:middle])
        time.sleep(0.0002)
        self.chunks.append(payload[middle:])
        return len(payload)

    def flush(self):
        pass


class TestEventTransport(unittest.TestCase):
    def test_jsonl_events_are_atomic_across_transcriber_callback_threads(self):
        sink = YieldingEventSink()
        start = threading.Barrier(8)

        def producer(worker_id):
            start.wait()
            for event_index in range(30):
                module.emit({
                    "type": "result" if worker_id % 2 else "drained",
                    "finalText": "test" if worker_id % 2 else "",
                    "interimText": "",
                    "worker": worker_id,
                    "sequence": event_index,
                })

        threads = [
            threading.Thread(target=producer, args=(index,)) for index in range(8)
        ]
        with patch.object(module.sys, "stdout", sink):
            for thread in threads:
                thread.start()
            for thread in threads:
                thread.join(timeout=5)
                self.assertFalse(thread.is_alive())

        lines = "".join(sink.chunks).splitlines()
        self.assertEqual(len(lines), 240)
        events = [json.loads(line) for line in lines]
        self.assertEqual(
            {(event["worker"], event["sequence"]) for event in events},
            {(worker, sequence) for worker in range(8) for sequence in range(30)},
        )


if __name__ == "__main__":
    unittest.main()
