import hashlib
import json
import struct
import unittest
from inspect_packaged_asar import inspect_asar

def fixture(name="demo", metadata_name="demo", linked=False, nested=False):
    payload = bytearray()
    def file(raw):
        entry = {"offset": str(len(payload)), "size": len(raw)}
        payload.extend(raw)
        return entry
    files = {"package.json": file(json.dumps({"name": metadata_name, "version": "1.0.0"}).encode()),
             "LICENSE": {"link": "elsewhere"} if linked else file(b"license\r\n")}
    if nested:
        files["node_modules"] = {"files": {}}
    nodes = {"files": {"node_modules": {"files": {name: {"files": files}}}}}
    header = json.dumps(nodes).encode()
    padded = header + b"\0" * ((-len(header)) % 4)
    return struct.pack("<4I", 4, 8 + len(padded), 4 + len(padded), len(header)) + padded + payload

class PackagedAsarTests(unittest.TestCase):
    def test_exact_notice_bytes(self):
        data = fixture()
        result = inspect_asar(data)
        self.assertEqual(result["asarSha256"], hashlib.sha256(data).hexdigest())
        self.assertEqual(result["packages"], [{
            "name": "demo", "version": "1.0.0", "skippedNoticeCount": 0,
            "noticeFiles": [{"filename": "LICENSE", "bytes": 9,
                             "sha256": hashlib.sha256(b"license\r\n").hexdigest()}]
        }])
    def test_reject_bad_identity_or_external_notice(self):
        for data in (fixture(metadata_name="wrong"), fixture(linked=True),
                     fixture(nested=True), fixture()[:-1], b"not an archive"):
            with self.subTest(size=len(data)):
                with self.assertRaises(ValueError):
                    inspect_asar(data)

if __name__ == "__main__":
    unittest.main()
