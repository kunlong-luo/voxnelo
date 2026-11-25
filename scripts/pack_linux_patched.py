"""Linux x64 AppImage packaging guard for USN-8939-1.

Exact previously reviewed upstream inputs only. Build-only dependencies:
Python 3.10+, curl, 7z (p7zip-full), dpkg-deb, unsquashfs. Never install
the downloaded DEB or alter the shared electron-builder cache.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import shutil
import struct
import subprocess
import sys
import tempfile

from audit_appimage_distro_packages import dpkg_output, selected_members

TOOLSET_URL = "https://github.com/electron-userland/electron-builder-binaries/releases/download/appimage-12.0.1/appimage-12.0.1.7z"
TOOLSET_SHA = "d12ff7eb8f1d1ec4652ca5237a7fbdca33acc0c758045636feca62dc6ecb8ec4"
DEB_VERSION = "2:1.2.3-1ubuntu0.22.04.1"
DEB_NAME = "libxtst6_1.2.3-1ubuntu0.22.04.1_amd64.deb"
DEB_SHA = "1cda20d06d364fbe534755cfbe60e387fcecac537e7ab5b8c7a9e83bffd911f8"
DEB_URLS = (
    "https://archive.ubuntu.com/ubuntu/pool/main/libx/libxtst/" + DEB_NAME,
    "https://security.ubuntu.com/ubuntu/pool/main/libx/libxtst/" + DEB_NAME,
)
OLD_ELF = "38f9ccb12d2c477aad85db6279afc334d9f250f613884c188ace7232b83e9b68"
PATCHED_ELF = "4198b32dc9fba7dfc0ee2bb1b6bc85067c89adfc68d0279059ad82c207cc3c35"
NOTICE_SHA = "304f78731e1e0e78132fbba4e1909c8642878a3b8c4837b36cb2d38891bf2204"
ELF_MEMBER = "usr/lib/libXtst.so.6"
NOTICE_NAME = "Ubuntu-libXtst.txt"
NOTICE_MEMBER = "resources/THIRD-PARTY-NOTICES/" + NOTICE_NAME
DEB_ELF = "usr/lib/x86_64-linux-gnu/libXtst.so.6.1.0"
DEB_NOTICE = "usr/share/doc/libxtst6/copyright"
MAX_ARCHIVE = 4 * 1024 * 1024
MAX_IMAGE = 1024 * 1024 * 1024


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def require_bytes(raw, expected, label):
    if not raw or digest(raw) != expected:
        raise ValueError(label + " SHA-256 mismatch")
    return raw


def read_regular(path, limit):
    if path.is_symlink() or not path.is_file() or not 0 < path.stat().st_size <= limit:
        raise ValueError("Missing, linked or oversized input: " + path.name)
    with path.open("rb") as stream:
        raw = stream.read(limit + 1)
    if not 0 < len(raw) <= limit:
        raise ValueError("Input exceeds bounds: " + path.name)
    return raw


def download(urls, path, expected):
    for url in urls:
        result = subprocess.run(
            ["curl", "--fail", "--silent", "--show-error", "--location",
             "--proto", "=https", "--proto-redir", "=https", "--connect-timeout", "10",
             "--max-time", "120", "--max-filesize", str(MAX_ARCHIVE), url, "-o", str(path)],
            timeout=130, check=False,
        )
        if result.returncode == 0:
            # A successful response with wrong bytes is fatal, never a fallback.
            require_bytes(read_regular(path, MAX_ARCHIVE), expected, path.name)
            return
        path.unlink(missing_ok=True)
    raise ValueError("Pinned input unavailable: " + path.name)


def patch_toolset(toolset, deb):
    require_bytes(read_regular(deb, MAX_ARCHIVE), DEB_SHA, "Patched DEB")
    fields = {field: dpkg_output(["--field", str(deb), field]).decode().strip()
              for field in ("Package", "Version", "Architecture")}
    if fields != {"Package": "libxtst6", "Version": DEB_VERSION, "Architecture": "amd64"}:
        raise ValueError("Patched DEB identity mismatch")
    members = selected_members(dpkg_output(["--fsys-tarfile", str(deb)]),
                               {DEB_ELF, DEB_NOTICE})
    patched = require_bytes(members[DEB_ELF], PATCHED_ELF, "Patched ELF")
    notice = require_bytes(members[DEB_NOTICE], NOTICE_SHA, "Patched copyright")
    dest = toolset / "lib/x64/libXtst.so.6"
    require_bytes(read_regular(dest, MAX_ARCHIVE), OLD_ELF, "Original toolset ELF")
    dest.write_bytes(patched)
    return notice


def squashfs_offset(prefix, size):
    offsets = []
    for match in re.finditer(b"hsqs", prefix):
        offset = match.start()
        if offset + 96 > len(prefix):
            continue
        version = struct.unpack_from("<HH", prefix, offset + 28)
        block = struct.unpack_from("<I", prefix, offset + 12)[0]
        used = struct.unpack_from("<Q", prefix, offset + 40)[0]
        if version == (4, 0) and block in (4096,8192,16384,32768,65536,131072,262144,524288,1048576) and 96 <= used <= size-offset:
            offsets.append(offset)
    if prefix[:4] != b"\x7fELF" or len(offsets) != 1:
        raise ValueError("Expected unique bounded SquashFS v4 in AppImage")
    return offsets[0]


def verify(image):
    if image.is_symlink() or not image.is_file() or not 0 < image.stat().st_size <= MAX_IMAGE:
        raise ValueError("Invalid AppImage file")
    with image.open("rb") as stream:
        offset = squashfs_offset(stream.read(16 * 1024 * 1024), image.stat().st_size)
    command = ["unsquashfs", "-o", str(offset)]
    listing = subprocess.check_output(command + ["-ls", str(image)], timeout=90, text=True)
    names = [line for line in listing.splitlines() if "libXtst.so" in line]
    if names != ["squashfs-root/" + ELF_MEMBER]:
        raise ValueError("Unexpected missing or duplicate Xtst member")
    if listing.splitlines().count("squashfs-root/" + NOTICE_MEMBER) != 1:
        raise ValueError("Missing or duplicate Xtst copyright member")
    for member, expected in ((ELF_MEMBER, PATCHED_ELF), (NOTICE_MEMBER, NOTICE_SHA)):
        raw = subprocess.check_output(command + ["-cat", str(image), member], timeout=60)
        require_bytes(raw, expected, member)
    return {"schemaVersion": 1, "packageVersion": DEB_VERSION, "patchedElfSha256": PATCHED_ELF,
            "copyrightSha256": NOTICE_SHA, "squashfsOffset": offset, "legalApproval": False,
            "physicalAcceptance": False, "publicReleaseApproved": False}


def build():
    if sys.platform != "linux" or platform.machine() not in ("x86_64", "amd64"):
        raise ValueError("Patched AppImage build supports Linux x64 only")
    for tool in ("curl", "7z", "dpkg-deb", "unsquashfs", "pnpm"):
        if not shutil.which(tool):
            raise ValueError("Missing build prerequisite: " + tool)
    metadata = json.loads(Path("package.json").read_text())
    version = metadata["version"]
    if not re.fullmatch(r"\d+\.\d+\.\d+", version):
        raise ValueError("Invalid application version")
    builder = json.loads(Path("node_modules/electron-builder/package.json").read_text())
    if builder["version"] != "26.18.0":
        raise ValueError("electron-builder changed; re-audit native toolset before building")
    image = Path("release") / ("Voxnelo-" + version + ".AppImage")
    notice_path = Path("build/third-party-notices") / NOTICE_NAME
    if image.exists() or image.is_symlink():
        raise ValueError("Move existing same-version AppImage out of release/ before rebuilding")
    if notice_path.exists() or notice_path.is_symlink():
        raise ValueError("Refusing to overwrite existing generated notice")
    with tempfile.TemporaryDirectory(prefix="voxnelo-appimage-toolset-") as directory:
        temp = Path(directory)
        archive, deb, toolset = temp/"toolset.7z", temp/DEB_NAME, temp/"toolset"
        download((TOOLSET_URL,), archive, TOOLSET_SHA)
        download(DEB_URLS, deb, DEB_SHA)
        toolset.mkdir()
        subprocess.run(["7z", "x", "-y", "-o" + str(toolset), str(archive)],
                       check=True, timeout=120)
        notice = patch_toolset(toolset, deb)
        # The notice is a build-only input to existing extraResources. Use
        # exclusive creation; never replace a source-controlled or user file.
        with notice_path.open("xb") as stream:
            try:
                stream.write(notice)
            except BaseException:
                notice_path.unlink()
                raise
        try:
            env = dict(os.environ, APPIMAGE_TOOLS_PATH=str(toolset),
                       CSC_IDENTITY_AUTO_DISCOVERY="false")
            subprocess.run(["pnpm", "exec", "electron-builder", "--linux", "deb",
                            "AppImage", "--x64", "--config.toolsets.appimage=0.0.0",
                            "--publish", "never"], env=env, check=True, timeout=1200)
            print(json.dumps(verify(image), indent=2))
        except BaseException:
            # Do not leave a failed/unverified same-version AppImage for later
            # manifest or upload steps. No previous image was overwritten.
            image.unlink(missing_ok=True)
            raise
        finally:
            notice_path.unlink()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify", type=Path, help="read-only final AppImage verification")
    args = parser.parse_args()
    try:
        if args.verify is None:
            build()
        else:
            print(json.dumps(verify(args.verify), indent=2))
    except (ValueError, OSError, subprocess.SubprocessError) as exc:
        print("AppImage patch gate failed: " + str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
