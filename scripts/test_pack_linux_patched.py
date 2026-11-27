"""Offline regression tests for fail-closed native package checks."""
import hashlib
import io
import tarfile
import pathlib
import struct
import tempfile
import unittest
from unittest.mock import patch

import pack_linux_patched as guard
import appimage_distro_payload as distro


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
            with patch.object(guard, "PATCHED_ELF", guard.digest(elf)), patch.object(guard, "NOTICE_SHA", guard.digest(notice)), patch.object(guard, "expected_members", return_value={}):
                with patch.object(guard.subprocess, "check_output", side_effect=[listing, elf, notice]):
                    self.assertFalse(guard.verify(image)["legalApproval"])
                for evidence in ([listing, b"old", notice], [listing, elf, b"changed"],
                                 [listing+"squashfs-root/elsewhere/libXtst.so.6\n"],
                                 ["squashfs-root/"+guard.ELF_MEMBER+"\n"]):
                    with self.subTest(evidence=evidence), patch.object(guard.subprocess, "check_output", side_effect=evidence), self.assertRaises(ValueError):
                        guard.verify(image)


    def test_notice_and_source_inventory_pins(self):
        members = distro.expected_members(guard.digest)
        self.assertEqual(len(members), 36)
        self.assertEqual(sum(name.endswith(".dsc") for name in members), 6)
        self.assertEqual(sum(name.endswith("-copyright.txt") for name in members), 5)
        self.assertTrue(all(len(value) == 64 for value in members.values()))

    def test_reject_missing_or_changed_distro_payload(self):
        with tempfile.TemporaryDirectory() as tmp:
            image = pathlib.Path(tmp) / "test.AppImage"
            image.write_bytes(image_prefix())
            member = distro.PREFIX + "sources/example.dsc"
            raw = b"source fixture"
            elf, notice = b"elf fixture", b"notice fixture"
            listing = "\n".join("squashfs-root/" + name for name in
                                (guard.ELF_MEMBER, guard.NOTICE_MEMBER, member)) + "\n"
            with patch.object(guard, "PATCHED_ELF", guard.digest(elf)), \
                    patch.object(guard, "NOTICE_SHA", guard.digest(notice)), \
                    patch.object(guard, "expected_members", return_value={member: guard.digest(raw)}):
                with patch.object(guard.subprocess, "check_output", side_effect=[listing, elf, notice, raw]):
                    self.assertEqual(guard.verify(image)["verifiedDistroPayloadMembers"], 3)
                for evidence in ([listing, elf, notice, b"changed"],
                                 [listing.replace("squashfs-root/" + member + "\n", ""), elf, notice],
                                 [listing + "squashfs-root/" + member + "\n", elf, notice]):
                    with patch.object(guard.subprocess, "check_output", side_effect=evidence), self.assertRaises(ValueError):
                        guard.verify(image)

    def test_copying_member_is_regular_unique_and_bounded(self):
        def archive(kinds):
            stream = io.BytesIO()
            with tarfile.open(fileobj=stream, mode="w") as tar:
                for kind in kinds:
                    item = tarfile.TarInfo("root/COPYING")
                    item.type = kind
                    item.size = 7 if item.isfile() else 0
                    item.linkname = "elsewhere"
                    tar.addfile(item, io.BytesIO(b"fixture") if item.isfile() else None)
            return stream.getvalue()
        self.assertEqual(distro.read_copying(archive([tarfile.REGTYPE]), "root/COPYING"), b"fixture")
        for kinds in ([], [tarfile.SYMTYPE], [tarfile.REGTYPE, tarfile.REGTYPE]):
            with self.assertRaises(ValueError):
                distro.read_copying(archive(kinds), "root/COPYING")


if __name__ == "__main__":
    unittest.main()
