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


class TestTranscriptState(unittest.TestCase):
    def test_ordered_line_completion_and_terminal_finish(self):
        messages = []
        state = module.TranscriptState()
        with patch.object(module, "emit", messages.append):
            state.text_changed("hello wrld")
            state.text_changed("hello world")
            state.line_completed("hello world")
            state.text_changed("next segment")
            # Stop must use SDK-confirmed line completion, not the interim.
            state.line_completed("next complete")
            state.finish()
            # SDK threads that return after stop must NOT publish late changes.
            state.text_changed("late interim")
            state.line_completed("late completion")
            state.finish()

        self.assertEqual(messages[-2:], [
            {"type": "result", "finalText": "hello world next complete",
             "interimText": ""},
            {"type": "finished"},
        ])
        self.assertEqual(sum(m["type"] == "finished" for m in messages), 1)
        self.assertEqual(messages[-1]["type"], "finished")
        self.assertTrue(all(
            len(m["finalText"]) <= module.MAX_FINAL
            for m in messages if m["type"] == "result"
        ))

    def test_empty_completed_segment_clears_stale_partial_not_finalized(self):
        messages = []
        state = module.TranscriptState()
        with patch.object(module, "emit", messages.append):
            state.text_changed("unfinished guess")
            state.line_completed("")
            state.finish()
        self.assertEqual(messages[-2]["finalText"], "")
        self.assertEqual(messages[-2]["interimText"], "")
        self.assertEqual(messages[-1]["type"], "finished")

    def test_completed_transcripts_are_bounded_during_extended_dictation(self):
        messages = []
        state = module.TranscriptState()
        with patch.object(module, "emit", messages.append):
            for i in range(800):
                state.line_completed("spoken-%04d %s" % (i, "word " * 10))
            state.finish()
        self.assertEqual(messages[-1]["type"], "finished")
        self.assertLessEqual(len(messages[-2]["finalText"]), module.MAX_FINAL)
        self.assertIn("spoken-0799", messages[-2]["finalText"])
        self.assertNotIn("spoken-0000", messages[-2]["finalText"])

    def test_concurrent_sdk_callback_events_are_serialized_before_finish(self):
        messages = []
        state = module.TranscriptState()
        barrier = threading.Barrier(8)

        def callback(worker):
            barrier.wait()
            for i in range(20):
                state.text_changed("partial-%d-%d" % (worker, i))
                state.line_completed("word-%d-%d" % (worker, i))

        threads = [threading.Thread(target=callback, args=(i,))
                   for i in range(8)]
        with patch.object(module, "emit", messages.append):
            for thread in threads:
                thread.start()
            for thread in threads:
                thread.join(timeout=5)
                self.assertFalse(thread.is_alive())
            state.finish()
            # Simulate callbacks still being queued when Python returns.
            state.text_changed("should not leak")
            state.line_completed("should not append")

        result_events = [m for m in messages if m["type"] == "result"]
        expected_tokens = {"word-%d-%d" % (worker, i)
                           for worker in range(8) for i in range(20)}
        final_tokens = set(messages[-2]["finalText"].split())
        self.assertEqual(final_tokens, expected_tokens)
        self.assertEqual(messages[-1]["type"], "finished")
        self.assertEqual(len(messages[-2]["finalText"]), len(result_events[-1]["finalText"]))
        self.assertTrue(all(
            len(m["finalText"]) <= module.MAX_FINAL
            and len(m["interimText"]) <= module.MAX_INTERIM
            for m in result_events
        ))


if __name__ == "__main__":
    unittest.main()
