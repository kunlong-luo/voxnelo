"""Read-only Ubuntu historical DEB evidence against measured candidate ELF bytes.

Linux only; no install, maintainer scripts, network, extraction or legal approval.
Supply original archives in a private directory. Inspect report, including missing
files and mismatch states; independently authenticate distributor archive metadata.
"""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import resource
import re
import subprocess
import tarfile
import tempfile

MAX_DEB = 4 * 1024 * 1024
MAX_TAR = 32 * 1024 * 1024
MAX_MEMBER = 2 * 1024 * 1024
# Exact current candidate source and actual reviewed ELF bytes. Five historical
# recipe packages plus the current patched libXtst, never the pre-patch library.
CANDIDATE_RUN = 45723704316
CANDIDATE_SOURCE = "0ccc624ab893396829de40b4ed3b7d84de656e3a"
PATCHED_XTST_VERSION = "2:1.2.3-1ubuntu0.22.04.1"
PATCHED_XTST_ARCHIVE_SHA = "1cda20d06d364fbe534755cfbe60e387fcecac537e7ab5b8c7a9e83bffd911f8"
PATCHED_XTST_COPYRIGHT_SHA = "304f78731e1e0e78132fbba4e1909c8642878a3b8c4837b36cb2d38891bf2204"
PACKAGES = (
    ("libxss1", "1.2.2-1", "libXss.so.1.0.0", "270fe6e4d430118793d01cac5c6081d0ea9e244cfcf510475bc779bef21b754a"),
    ("libxtst6", "1.2.3-1ubuntu0.22.04.1", "libXtst.so.6.1.0", "4198b32dc9fba7dfc0ee2bb1b6bc85067c89adfc68d0279059ad82c207cc3c35"),
    ("libappindicator1", "12.10.1+13.10.20130920-0ubuntu4", "libappindicator.so.1.0.0", "033b8803f20b98e8cd56fc8e75e3a71a552f75c0cff9bd0937f3ddd6ee5d2145"),
    ("libgconf-2-4", "3.2.6-0ubuntu2", "libgconf-2.so.4.1.5", "ba977334112bb81f6457ee4aad833c6d5f1ff731c718073cd50777d613b23185"),
    ("libindicator7", "12.10.2+14.04.20140402-0ubuntu1", "libindicator.so.7.0.0", "3b61ae3424c4800975c1806245a2d286f6e1fc49cd9350913075c27a95f3c7a0"),
    ("libnotify4", "0.7.6-1ubuntu3", "libnotify.so.4.0.0", "8f42294247a886c5a94b2a0ce1c0b65e953616d7efe8da664b3826cdeae47948"),
)


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def selected_members(data, expected):
    """Read exact regular members; never follow tar links or extract."""
    if not 0 < len(data) <= MAX_TAR:
        raise ValueError("tar bounds")
    found = {}
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:") as archive:
        for count, member in enumerate(archive, 1):
            if count > 10000:
                raise ValueError("tar member count")
            name = member.name.removeprefix("./")
            if name not in expected:
                continue
            if name in found or not member.isfile() or not 0 < member.size <= MAX_MEMBER:
                raise ValueError("invalid selected member")
            source = archive.extractfile(member)
            if source is None:
                raise ValueError("missing selected member bytes")
            with source:
                raw = source.read(MAX_MEMBER + 1)
            if len(raw) != member.size:
                raise ValueError("truncated selected member")
            found[name] = raw
    if set(found) != set(expected):
        raise ValueError("missing selected members")
    return found


def limited_child():
    resource.setrlimit(resource.RLIMIT_FSIZE, (MAX_TAR, MAX_TAR))
    resource.setrlimit(resource.RLIMIT_CPU, (15, 15))


def dpkg_output(args):
    # A private temporary file, not a pipe with unbounded memory buffering.
    with tempfile.TemporaryFile() as output:
        result = subprocess.run(["dpkg-deb", *args], stdout=output,
                                stderr=subprocess.DEVNULL, timeout=30,
                                preexec_fn=limited_child, check=False)
        if result.returncode != 0 or output.tell() > MAX_TAR:
            raise ValueError("dpkg read failed")
        output.seek(0)
        return output.read(MAX_TAR + 1)


def inspect(directory, spec):
    name, version, elf, expected_sha = spec
    filename = f"{name}_{version}_amd64.deb"
    path = directory / filename
    result = {"package": name, "recipeVersion": version, "filename": filename,
              "candidateElfSha256": expected_sha, "status": "missing"}
    if not path.exists() and not path.is_symlink():
        return result
    try:
        if path.is_symlink() or not path.is_file() or not 0 < path.stat().st_size <= MAX_DEB:
            raise ValueError("archive bounds")
        with path.open("rb") as stream:
            raw = stream.read(MAX_DEB + 1)
        if not 0 < len(raw) <= MAX_DEB:
            raise ValueError("archive bounds")
        archive_sha = digest(raw)
        result.update({"archiveBytes": len(raw), "archiveSha256": archive_sha})
        if name == "libxtst6" and archive_sha != PATCHED_XTST_ARCHIVE_SHA:
            result["status"] = "archive-mismatch"
            return result
        # Copy bounded bytes to a private fresh file, avoiding path races between
        # identity and payload reads. Never execute any package content.
        with tempfile.TemporaryDirectory(prefix="voxnelo-deb-review-") as temporary:
            frozen = Path(temporary) / "input.deb"
            frozen.write_bytes(raw)
            fields = [dpkg_output(["--field", str(frozen), field]).decode("utf-8").strip()
                      for field in ("Package", "Version", "Architecture", "Source")]
            package, actual_version, arch, source = fields
            if (package != name or arch != "amd64"
                    or not re.fullmatch(r"(?:[0-9]+:)?" + re.escape(version), actual_version)
                    or (name == "libxtst6" and actual_version != PATCHED_XTST_VERSION)):
                raise ValueError("package identity mismatch")
            elf_path = "usr/lib/x86_64-linux-gnu/" + elf
            copyright_path = "usr/share/doc/" + name + "/copyright"
            members = selected_members(dpkg_output(["--fsys-tarfile", str(frozen)]),
                                       {elf_path, copyright_path})
        observed = digest(members[elf_path])
        copyright_sha = digest(members[copyright_path])
        result.update({"version": actual_version, "sourceField": source or package,
                       "elfSha256": observed, "elfBytes": len(members[elf_path]),
                       "copyrightSha256": copyright_sha,
                       "copyrightBytes": len(members[copyright_path]),
                       "status": "matched" if observed == expected_sha else "mismatch"})
        if name == "libxtst6" and copyright_sha != PATCHED_XTST_COPYRIGHT_SHA:
            result["status"] = "copyright-mismatch"
    except (ValueError, OSError, subprocess.SubprocessError, tarfile.TarError):
        result["status"] = "inspection-failed"
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    args = parser.parse_args()
    if not args.directory.is_dir() or args.directory.is_symlink():
        parser.error("supply an existing private directory")
    records = [inspect(args.directory, spec) for spec in PACKAGES]
    complete = all(record["status"] == "matched" for record in records)
    print(json.dumps({"schemaVersion": 1, "candidateRun": CANDIDATE_RUN,
                      "candidateSource": CANDIDATE_SOURCE,
                      "allMatched": complete, "legalApproval": False,
                      "distributorSignatureVerified": False, "packages": records}, indent=2))
    return 0 if complete else 1


if __name__ == "__main__":
    raise SystemExit(main())
