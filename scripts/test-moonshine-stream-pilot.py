"""Pure protocol tests: do not download the SDK/model or touch a microphone."""
import importlib.util
from pathlib import Path
import unittest

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


if __name__ == "__main__":
    unittest.main()
