"""Offline regression tests for fail-closed native package checks."""
import hashlib
import pathlib
import struct
import tempfile
import unittest
from unittest.mock import patch

import pack_linux_patched as guard


def image_prefix():
    data = bytearray(256)
    data[:4] = b"\x7fELF"
    offset = 128
    data[offset:offset+4] = b"hsqs"
    struct.pack_into("<I", data, offset+12, 4096)
    struct.pack_into("<HH", data, offset+28, 4, 0)
    struct.pack_into("<Q", data, offset+40, 128)
    return bytes(data)


class PatchGateTests(unittest.TestCase):
    def test_reject_changed_or_empty_input(self):
        expected = hashlib.sha256(b"pinned").hexdigest()
        self.assertEqual(guard.require_bytes(b"pinned", expected, "fixture"), b"pinned")
        for raw in (b"", b"altered"):
            with self.subTest(raw=raw), self.assertRaises(ValueError):
                guard.require_bytes(raw, expected, "fixture")

    def test_reject_missing_linked_or_oversized_input(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            target = root/"file"
            for path in (target,):
                with self.assertRaises(ValueError):
                    guard.read_regular(path, 10)
            target.write_bytes(b"123456")
            with self.assertRaises(ValueError):
                guard.read_regular(target, 5)
            linked = root/"link"
            linked.symlink_to(target)
            with self.assertRaises(ValueError):
                guard.read_regular(linked, 10)

    def test_container_bounds(self):
        self.assertEqual(guard.squashfs_offset(image_prefix(), 256), 128)
        for prefix, size in ((b"bad", 3), (image_prefix(), 200), (image_prefix()[4:], 256)):
            with self.subTest(size=size), self.assertRaises(ValueError):
                guard.squashfs_offset(prefix, size)

    def test_final_payload_rejects_legacy_or_altered_members(self):
        with tempfile.TemporaryDirectory() as tmp:
            image = pathlib.Path(tmp)/"test.AppImage"
            image.write_bytes(image_prefix())
            listing = "squashfs-root/"+guard.ELF_MEMBER+"\nsquashfs-root/"+guard.NOTICE_MEMBER+"\n"
            elf, notice = b"patched fixture", b"notice fixture"
            with patch.object(guard, "PATCHED_ELF", guard.digest(elf)), patch.object(guard, "NOTICE_SHA", guard.digest(notice)):
                with patch.object(guard.subprocess, "check_output", side_effect=[listing, elf, notice]):
                    self.assertFalse(guard.verify(image)["legalApproval"])
                for evidence in ([listing, b"old", notice], [listing, elf, b"changed"],
                                 [listing+"squashfs-root/elsewhere/libXtst.so.6\n"],
                                 ["squashfs-root/"+guard.ELF_MEMBER+"\n"]):
                    with self.subTest(evidence=evidence), patch.object(guard.subprocess, "check_output", side_effect=evidence), self.assertRaises(ValueError):
                        guard.verify(image)


if __name__ == "__main__":
    unittest.main()
