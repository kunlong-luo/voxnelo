#!/usr/bin/env python3
"""Export exact legal text from already-verified Wheel ZIPs to a PRIVATE directory.

Local reviewer handoff ONLY: no network, no native imports, no installer/release
updates, no upload. Matching a PyPI checksum is not publisher build attestation
or legal approval; every extracted item remains PENDING manual review.
"""
from __future__ import annotations

import hashlib
import importlib.util
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import sys
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
PINNED_SNAPSHOT = ROOT / "docs/engineering/moonshine-python312-wheel-digests-2026-11-23.json"


def verify_cli_snapshot_path(snapshot_file: Path) -> None:
    # The public-facing CLI must never accept an alternate user-crafted
    # "approved hashes" file, even if it has the expected JSON schema.
    # The low-level prepare() helper accepts synthetic fixture snapshots for
    # offline tests; this guard is mandatory at the actual CLI entry point.
    if snapshot_file.resolve(strict=True) != PINNED_SNAPSHOT.resolve(strict=True):
        raise ValueError("Private reviewer must use the repository-tracked Wheel hash snapshot")



def load_script(filename: str):
    path = ROOT / "scripts" / filename
    spec = importlib.util.spec_from_file_location(filename.removesuffix(".py"), path)
    if spec is None or spec.loader is None:
        raise ValueError("Unable to load local offline audit module")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


collector = load_script("collect-moonshine-wheel-archive-evidence.py")
auditor = load_script("audit-moonshine-wheelhouse.py")


def write_private(path: Path, content: bytes) -> None:
    # No inherited/overwritten files, no content in stdout or git artifacts.
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "wb") as output:
        output.write(content)


def prepare(
    wheelhouse: Path, report_file: Path, snapshot_file: Path, output_dir: Path,
) -> dict:
    if (not output_dir.is_absolute() or output_dir.exists() or output_dir.is_symlink()
            or output_dir.resolve(strict=False).is_relative_to(ROOT)):
        raise ValueError("Use a new absolute private output directory OUTSIDE the repository")
    parent = output_dir.parent
    # A symlink or Windows directory junction higher in the path can redirect
    # even when the final parent itself is real; reject the full ancestry.
    if (not parent.is_dir()
            or any(ancestor.is_symlink() or ancestor.is_junction()
                   for ancestor in (parent, *parent.parents))):
        raise ValueError("Private output path requires real, non-redirected ancestors")

    report = json.loads(report_file.read_text(encoding="utf-8"))
    if (not isinstance(report, dict)
            or report.get("nativePlatform") not in ("linux", "win32", "darwin")
            or report.get("candidatePython") != "3.12"):
        raise ValueError("Only the pinned Python 3.12 three-platform report is supported")
    auditor.verify_committed_snapshot(report, snapshot_file)
    evidence = collector.collect(wheelhouse, report_file)
    if (evidence["missingDeclaredLicenseFileCount"] != 0
            or evidence["packageCount"] not in (13, 14)
            or evidence["platform"] != report["nativePlatform"]):
        raise ValueError("Wheel legal file declarations incomplete: review blocked")

    # Everything above is read-only; only now allocate an empty private folder.
    output_dir.mkdir(mode=0o700)
    try:
        (output_dir / "raw-text").mkdir(mode=0o700)
        manifest = {
            "schemaVersion": 1,
            "source": "original exact-hash pinned Python Wheels; LOCAL REVIEW ONLY",
            "platform": evidence["platform"],
            "candidatePython": "3.12",
            "packageCount": evidence["packageCount"],
            "exportedLegalFileCount": 0,
            "licenseApproved": False,
            "noticeObligationsApproved": False,
            "modelRightsApproved": False,
            "releaseApproved": False,
            "reviewRequired": True,
            "packages": [],
        }
        serial = 0
        for package in evidence["packages"]:
            filename = package["filename"]
            wheel = wheelhouse / filename
            # Rehash after the first scan to reject a changed input directory.
            with wheel.open("rb") as stream:
                if collector.sha256_bytes(stream) != package["sha256"]:
                    raise ValueError("Pinned Wheel changed before local text export")

            result = {
                "name": package["name"],
                "version": package["version"],
                "wheelFilename": filename,
                "wheelSha256": package["sha256"],
                "metadataSha256": package["metadataSha256"],
                "licenseExpression": package["licenseExpression"],
                "licenseClassifiers": package["licenseClassifiers"],
                "declaredLicenseFiles": package["declaredLicenseFiles"],
                "missingDeclaredLicenseFiles": package["missingDeclaredLicenseFiles"],
                "nativeBinaryFiles": package["nativeBinaryFiles"],
                "localLegalText": [],
                "reviewStatus": "PENDING",
                "reviewRequired": True,
            }
            with ZipFile(wheel) as archive:
                members = [{
                    "path": package["distInfoRoot"] + "/METADATA",
                    "type": "core-metadata",
                    "sha256": package["metadataSha256"],
                }] + [
                    {"path": item["path"], "type": "legal-file", "sha256": item["sha256"]}
                    for item in package["noticeFiles"]
                ]
                for member in members:
                    name = member["path"]
                    if (member["type"] == "legal-file"
                            and collector.NON_LEGAL_PAYLOAD.search(PurePosixPath(name).name)):
                        raise ValueError("Executable or model payload cannot be legal review text")
                    info = archive.getinfo(name)
                    limit = (collector.MAX_METADATA if member["type"] == "core-metadata"
                             else collector.MAX_TEXT)
                    if info.is_dir() or info.file_size > limit:
                        raise ValueError("Unexpected or oversized reviewer text member")
                    data = archive.read(info)
                    actual = hashlib.sha256(data).hexdigest()
                    if member.get("sha256", actual) != actual:
                        raise ValueError("Original license ZIP entry changed after audit")
                    serial += 1
                    local = "raw-text/" + f"{serial:04d}.raw"
                    write_private(output_dir / local, data)
                    result["localLegalText"].append({
                        "type": member["type"],
                        "archiveMember": name,
                        "localFile": local,
                        "sha256": actual,
                        "reviewStatus": "PENDING",
                    })
                    if member["type"] == "legal-file":
                        manifest["exportedLegalFileCount"] += 1
            # Close ZIP before a final whole-Wheel check, including members
            # that are not themselves legal documents. This detects drift
            # during export even if only unreviewed payload bytes changed.
            with wheel.open("rb") as stream:
                if collector.sha256_bytes(stream) != package["sha256"]:
                    raise ValueError("Pinned Wheel changed during local text export")
            manifest["packages"].append(result)

        write_private(output_dir / "REVIEW-INDEX.json",
                      (json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
                      .encode("utf-8"))
        return manifest
    except Exception:
        # The destination is new and created by this invocation only; avoid
        # leaving a partial plaintext review folder after an export error.
        shutil.rmtree(output_dir)
        raise


def main() -> None:
    if len(sys.argv) != 5:
        raise SystemExit(
            "Usage: python scripts/prepare-moonshine-private-license-review.py "
            "<existing-private-wheelhouse> <registry-verified-report.json> "
            "<committed-wheel-snapshot.json> <NEW-ABSOLUTE-private-output-dir>"
        )
    try:
        args = tuple(Path(value) for value in sys.argv[1:])
        verify_cli_snapshot_path(args[2])
        manifest = prepare(*args)
    except (OSError, ValueError, KeyError, TypeError, json.JSONDecodeError):
        # No personal absolute paths or license text in CLI errors.
        raise SystemExit("Private license-review export blocked; no approval or release") from None
    print(
        f"PRIVATE local review: {manifest['packageCount']} original Wheels, "
        f"{manifest['exportedLegalFileCount']} unmodified legal files; "
        "all source/NOTICE/model rights and release decisions remain PENDING. "
        "Do not upload this folder."
    )


if __name__ == "__main__":
    main()
