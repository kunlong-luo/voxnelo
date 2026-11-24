import hashlib
import io
import json
import tarfile
import unittest
from inspect_registry_notices import inspect_archive, nested_content_hint

def archive(entries):
    output = io.BytesIO()
    with tarfile.open(fileobj=output, mode="w:gz") as target:
        for name, content in entries:
            info = tarfile.TarInfo(name)
            if content is None:
                info.type = tarfile.SYMTYPE
                info.linkname = "/not-read"
                target.addfile(info)
            else:
                info.size = len(content)
                target.addfile(info, io.BytesIO(content))
    return output.getvalue()

META = ("package/package.json", json.dumps({"name": "demo", "version": "1.0.0"}).encode())

class RegistryNoticeTests(unittest.TestCase):
    def test_exact_bytes_and_nested_count(self):
        text = b"original\r\n"
        result = inspect_archive(archive([META, ("package/LICENSE", text),
                                         ("package/vendor/NOTICE", b"nested"), ("package/COPYING", None)]))
        self.assertEqual(result["noticeFiles"], [{"filename": "LICENSE", "bytes": len(text),
                                                  "sha256": hashlib.sha256(text).hexdigest()}])
        self.assertEqual(result["skippedNoticeCount"], 1)
        self.assertEqual(result["nestedNoticeCount"], 1)
    def test_nested_notice_duplicate_and_distinct_bytes(self):
        result = inspect_archive(archive([META, ("package/LICENSE", b"root"),
                                         ("package/dist/LICENSE", b"root"),
                                         ("package/vendor/NOTICE", b"distinct"),
                                         ("package/vendor/COPYING", None)]))
        self.assertEqual(result["nestedNoticeCount"], 3)
        self.assertEqual(result["nestedSkippedNoticeCount"], 1)
        self.assertEqual(result["nestedNoticeFiles"], [
            {"archiveRelativePath": "dist/LICENSE", "bytes": 4,
             "sha256": hashlib.sha256(b"root").hexdigest(), "matchesRootNoticeBytes": True, "contentKindHint": "unclassified"},
            {"archiveRelativePath": "vendor/NOTICE", "bytes": 8,
             "sha256": hashlib.sha256(b"distinct").hexdigest(), "matchesRootNoticeBytes": False, "contentKindHint": "unclassified"},
        ])
    def test_nested_content_hints_do_not_hide_candidates(self):
        module = b'import createLucideIcon from "./factory"; export const Copyright = createLucideIcon("Copyright", []);'
        mapping = b'{"version":3,"sources":["copyright.ts"],"mappings":""}'
        result = inspect_archive(archive([META, ("package/LICENSE", b"root"),
                                         ("package/dist/copyright.mjs", module),
                                         ("package/dist/copyright.mjs.map", mapping)]))
        self.assertEqual(result["nestedNoticeCount"], 2)
        self.assertEqual([item["contentKindHint"] for item in result["nestedNoticeFiles"]],
                         ["copyright-icon-module-markers", "source-map-v3-structure"])
        self.assertEqual(nested_content_hint("dist/copyright.mjs", b"Copyright license text"), "unclassified")
        self.assertEqual(nested_content_hint("dist/copyright.mjs.map", b'{"version":3}'), "unclassified")
    def test_bad_paths_duplicates_and_missing_identity(self):
        for entries in [[META, ("package/../LICENSE", b"x")],
                        [META, ("package/LICENSE", b"x"), ("package/LICENSE", b"y")],
                        [("package/LICENSE", b"x")]]:
            with self.assertRaises(ValueError):
                inspect_archive(archive(entries))

if __name__ == "__main__":
    unittest.main()
