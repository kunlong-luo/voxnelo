"""Synthetic tar fixtures; not original distro package or legal evidence."""
import io
import tarfile
import tempfile
import unittest
from pathlib import Path
from audit_appimage_distro_packages import selected_members, inspect, PACKAGES


def fixture(entries):
    output = io.BytesIO()
    with tarfile.open(fileobj=output, mode="w") as tar:
        for name, raw, kind in entries:
            member = tarfile.TarInfo(name)
            member.type = kind
            member.size = len(raw)
            if kind == tarfile.SYMTYPE:
                member.linkname = "elsewhere"
            tar.addfile(member, io.BytesIO(raw))
    return output.getvalue()


class AuditTests(unittest.TestCase):
    def test_exact_regular_members(self):
        archive = fixture([("./usr/lib/example", b"ELF", tarfile.REGTYPE),
                           ("usr/share/doc/example/copyright", b"notice", tarfile.REGTYPE)])
        self.assertEqual(selected_members(archive, {"usr/lib/example",
                         "usr/share/doc/example/copyright"})["usr/lib/example"], b"ELF")

    def test_duplicate_missing_or_link_rejected(self):
        for entries in [
            [("wanted", b"x", tarfile.REGTYPE), ("./wanted", b"y", tarfile.REGTYPE)],
            [("other", b"x", tarfile.REGTYPE)],
            [("wanted", b"", tarfile.SYMTYPE)],
        ]:
            with self.subTest(entries=entries), self.assertRaises(ValueError):
                selected_members(fixture(entries), {"wanted"})

    def test_missing_package_not_approved(self):
        with tempfile.TemporaryDirectory() as root:
            self.assertEqual(inspect(Path(root), PACKAGES[0])["status"], "missing")


if __name__ == "__main__":
    unittest.main()
