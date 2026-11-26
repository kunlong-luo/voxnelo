"""Synthetic tar fixtures; not original distro package or legal evidence."""
import io
import hashlib
import json
from contextlib import redirect_stdout
from unittest.mock import patch
import tarfile
import tempfile
import unittest
from pathlib import Path
from audit_appimage_distro_packages import selected_members, inspect, PACKAGES, main


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


    def test_current_candidate_missing_archives_are_not_approved(self):
        with tempfile.TemporaryDirectory() as root:
            output = io.StringIO()
            with patch("sys.argv", ["audit", root]), redirect_stdout(output):
                self.assertEqual(main(), 1)
            report = json.loads(output.getvalue())
            self.assertEqual(report["candidateRun"], 45723704316)
            self.assertEqual(report["candidateSource"], "0ccc624ab893396829de40b4ed3b7d84de656e3a")
            self.assertEqual(len(report["packages"]), 6)
            self.assertTrue(all(x["status"] == "missing" for x in report["packages"]))
            self.assertFalse(report["allMatched"])
            self.assertFalse(report["legalApproval"])
            self.assertFalse(report["distributorSignatureVerified"])

    def test_patched_xtst_pins_and_rejects_untrusted_archive_before_dpkg(self):
        spec = next(x for x in PACKAGES if x[0] == "libxtst6")
        self.assertEqual(spec[1], "1.2.3-1ubuntu0.22.04.1")
        self.assertEqual(spec[3], "4198b32dc9fba7dfc0ee2bb1b6bc85067c89adfc68d0279059ad82c207cc3c35")
        with tempfile.TemporaryDirectory() as root:
            directory = Path(root)
            (directory / "libxtst6_1.2.2-1_amd64.deb").write_bytes(b"historical")
            self.assertEqual(inspect(directory, spec)["status"], "missing")
            (directory / f"{spec[0]}_{spec[1]}_amd64.deb").write_bytes(b"wrong")
            with patch("audit_appimage_distro_packages.dpkg_output") as dpkg:
                self.assertEqual(inspect(directory, spec)["status"], "archive-mismatch")
                dpkg.assert_not_called()

    def test_patched_xtst_requires_exact_epoch_and_copyright(self):
        # Synthetic mocked package metadata and member bytes, never real approval.
        raw, elf, copyright = b"fixture", b"fixture-elf", b"fixture-notice"
        sha = lambda value: hashlib.sha256(value).hexdigest()
        spec = ("libxtst6", "1.2.3-1ubuntu0.22.04.1", "libXtst.so.6.1.0", sha(elf))
        archive = fixture([
            ("usr/lib/x86_64-linux-gnu/" + spec[2], elf, tarfile.REGTYPE),
            ("usr/share/doc/libxtst6/copyright", copyright, tarfile.REGTYPE)])
        with tempfile.TemporaryDirectory() as root:
            directory = Path(root)
            (directory / f"{spec[0]}_{spec[1]}_amd64.deb").write_bytes(raw)
            with patch("audit_appimage_distro_packages.PATCHED_XTST_ARCHIVE_SHA", sha(raw)):
                for version, notice_sha, expected in [
                    (b"1.2.3-1ubuntu0.22.04.1", sha(copyright), "inspection-failed"),
                    (b"2:1.2.3-1ubuntu0.22.04.1", "0" * 64, "copyright-mismatch"),
                    (b"2:1.2.3-1ubuntu0.22.04.1", sha(copyright), "matched"),
                ]:
                    with self.subTest(version=version, expected=expected), \
                            patch("audit_appimage_distro_packages.PATCHED_XTST_COPYRIGHT_SHA", notice_sha), \
                            patch("audit_appimage_distro_packages.dpkg_output", side_effect=[
                                b"libxtst6", version, b"amd64", b"libxtst", archive]):
                        self.assertEqual(inspect(directory, spec)["status"], expected)

if __name__ == "__main__":
    unittest.main()
