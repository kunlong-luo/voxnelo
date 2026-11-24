#!/usr/bin/env python3
"""Inspect original, already SHA-verified PyPI Wheels without executing code.

Reports metadata, NOTICE/license filenames + digests, and native binary names
+ digests. NO raw legal text, personal paths, binary payloads, audio or secrets
are uploaded. Every item remains an explicit MANUAL legal review task.
"""
from __future__ import annotations

import hashlib
import json
from email.parser import BytesParser
from pathlib import Path, PurePosixPath
import re
import stat
import sys
from zipfile import ZipFile, BadZipFile

NATIVE = re.compile(r"(?:\.(?:dll|dylib|pyd|a|so)|\.so\.[0-9.]+)$", re.I)
NOTICE = re.compile(r"(?:licen[cs]e|notice|copyright|copying|third[-_]?party)", re.I)
# A license file can be named e.g. Apache-2.0.txt or AUTHORS. Its
# containing Wheel licenses directory is authoritative, not the basename.
LEGAL_DIRECTORIES = frozenset({
    'licenses', 'license', 'license_files', 'notices', 'copyrights', 'legal',
})
SHA = re.compile(r"^[a-f0-9]{64}$")
MAX_METADATA = 512_000
MAX_TEXT = 5_000_000
MAX_NATIVE = 256_000_000


def sha256_bytes(stream) -> str:
    digest = hashlib.sha256()
    for block in iter(lambda: stream.read(1 << 20), b""):
        digest.update(block)
    return digest.hexdigest()


def safe_name(name: str) -> str:
    posix = PurePosixPath(name)
    if (not name or len(name) > 600 or posix.is_absolute()
            or ".." in posix.parts or "\\" in name
            or any(ord(c) < 32 for c in name)):
        raise ValueError("Unsafe archive filename")
    return str(posix)


def identity(filename: str) -> tuple[str, str]:
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]+\.whl", filename):
        raise ValueError("Invalid wheel filename")
    parts = filename[:-4].split("-")
    if len(parts) not in (5, 6):
        raise ValueError("Malformed wheel identity")
    return re.sub(r"[-_.]+", "-", parts[0]).lower(), parts[1]


def inspect_wheel(wheel: Path, expected_sha: str) -> dict:
    if not SHA.fullmatch(expected_sha):
        raise ValueError("Invalid trusted digest")
    if wheel.is_symlink() or not wheel.is_file():
        raise ValueError("Missing or symlinked Wheel")
    with wheel.open("rb") as handle:
        if sha256_bytes(handle) != expected_sha:
            raise ValueError("Wheel changed after registered SHA-256 validation")
    name, version = identity(wheel.name)
    try:
        with ZipFile(wheel) as source:
            names: set[str] = set()
            metadata_names: list[str] = []
            licenses: list[dict] = []
            native: list[dict] = []
            for item in source.infolist():
                entry = safe_name(item.filename)
                if entry in names:
                    raise ValueError("Duplicate archive member")
                names.add(entry)
                mode = item.external_attr >> 16
                if stat.S_IFMT(mode) == stat.S_IFLNK:
                    raise ValueError("Symlink in downloaded Wheel")
                if item.is_dir():
                    continue
                if item.flag_bits & 1:
                    raise ValueError("Encrypted Wheel member")
                if entry.endswith(".dist-info/METADATA"):
                    metadata_names.append(entry)
                parts = PurePosixPath(entry).parts
                if (NOTICE.search(parts[-1])
                        or any(part.lower() in LEGAL_DIRECTORIES
                               for part in parts[:-1])):
                    if item.file_size > MAX_TEXT:
                        raise ValueError("Oversized notice file")
                    with source.open(item) as payload:
                        licenses.append({"path": entry, "sha256": sha256_bytes(payload)})
                if NATIVE.search(PurePosixPath(entry).name):
                    if item.file_size > MAX_NATIVE:
                        raise ValueError("Oversized native Wheel library")
                    with source.open(item) as payload:
                        native.append({
                            "path": entry,
                            "size": item.file_size,
                            "sha256": sha256_bytes(payload),
                        })
            if len(metadata_names) != 1:
                raise ValueError("Expected one Wheel distribution METADATA")
            info = source.getinfo(metadata_names[0])
            if info.file_size > MAX_METADATA:
                raise ValueError("Oversized Wheel METADATA")
            message = BytesParser().parsebytes(source.read(info), headersonly=True)
            recorded_name = message.get("Name", "")
            recorded_version = message.get("Version", "")
            if (re.sub(r"[-_.]+", "-", recorded_name).lower() != name
                    or recorded_version != version):
                raise ValueError("Wheel METADATA mismatches pinned package identity")
            # Per the Wheel distribution specification, the root-level
            # {distribution}-{version}.dist-info directory must identify this
            # very Wheel. A plausible Name/Version header placed in a foreign
            # .dist-info tree must not be used to attribute legal files.
            dist_info_root = metadata_names[0].removesuffix("/METADATA")
            expected_suffix = "-" + version + ".dist-info"
            if ("/" in dist_info_root
                    or not dist_info_root.endswith(expected_suffix)
                    or re.sub(r"[-_.]+", "-",
                              dist_info_root[:-len(expected_suffix)]).lower() != name):
                raise ValueError("Wheel .dist-info directory mismatches pinned identity")
            license_expression = message.get("License-Expression", "").strip()
            if len(license_expression) > 300:
                license_expression = ""
            classifiers = sorted(set(
                str(c)[:240] for c in message.get_all("Classifier", [])
                if c.startswith("License ::")
            ))
            declared_files: list[str] = []
            for declaration in message.get_all("License-File", []):
                if (not isinstance(declaration, str) or not declaration
                        or safe_name(declaration) != declaration
                        or declaration == "."):
                    raise ValueError("Unsafe License-File metadata path")
                declared_files.append(declaration)
            if len(declared_files) != len(set(declared_files)):
                raise ValueError("Duplicate License-File declaration")
            declared_files.sort()
            # PEP 639 / Wheel format: for Metadata-Version >= 2.4,
            # License-File values are relative to .dist-info/licenses/.
            # Report missing references without pretending that their mere
            # presence legally clears these binaries.
            archive_license_paths = {
                declaration: dist_info_root + "/licenses/" + declaration
                for declaration in declared_files
            }
            missing_declared = [
                name for name, candidate in archive_license_paths.items()
                if candidate not in names
            ]
            recorded = {entry["path"] for entry in licenses}
            for candidate in archive_license_paths.values():
                if candidate not in names or candidate in recorded:
                    continue
                info = source.getinfo(candidate)
                if info.file_size > MAX_TEXT:
                    raise ValueError("Oversized declared license file")
                with source.open(info) as payload:
                    licenses.append({"path": candidate, "sha256": sha256_bytes(payload)})
                recorded.add(candidate)
            metadata_version = message.get("Metadata-Version", "")
            if not re.fullmatch(r"[0-9]+\.[0-9]+", metadata_version):
                raise ValueError("Invalid Wheel core metadata version")
            core_major, core_minor = (int(part) for part in metadata_version.split("."))
            pep639_layout_required = (core_major, core_minor) >= (2, 4)
            return {
                "name": name,
                "version": version,
                "filename": wheel.name,
                "sha256": expected_sha,
                "distInfoRoot": dist_info_root,
                "distInfoMatchesWheelIdentity": True,
                "licenseExpression": license_expression or None,
                "legacyLicenseFieldPresent": bool(message.get("License")),
                "licenseClassifiers": classifiers,
                "declaredLicenseFiles": declared_files,
                "declaredLicenseArchivePaths": archive_license_paths,
                "missingDeclaredLicenseFiles": missing_declared,
                "pep639LicenseLayoutRequired": pep639_layout_required,
                "declaredLicenseFilesLocated": not missing_declared,
                "noticeFiles": sorted(licenses, key=lambda a: a["path"]),
                "nativeBinaryFiles": sorted(native, key=lambda a: a["path"]),
                "manualReviewRequired": True,
            }
    except (BadZipFile, RuntimeError, OSError, UnicodeError) as exc:
        raise ValueError("Invalid pinned Wheel archive") from exc


def collect(wheelhouse: Path, audit_report: Path) -> dict:
    source = json.loads(audit_report.read_text(encoding="utf-8"))
    if (source.get("schemaVersion") != 1
            or source.get("buildProvenanceAttested") is not False
            or source.get("licenseApproved") is not False
            or source.get("humanMicAccepted") is not False):
        raise ValueError("Untrusted or already-approved audit report")
    records = source.get("wheels", [])
    if not isinstance(records, list) or len(records) not in (13, 14):
        raise ValueError("Incomplete candidate wheel report")
    expected: dict[str, str] = {}
    for record in records:
        if (not isinstance(record, dict)
                or record.get("pypiPublishedDigestMatched") is not True
                or not isinstance(record.get("filename"), str)
                or not isinstance(record.get("sha256"), str)):
            raise ValueError("Unverified Wheel audit entry")
        key = record["filename"]
        if key in expected:
            raise ValueError("Duplicate filename in Wheel report")
        expected[key] = record["sha256"]
    if not wheelhouse.is_dir() or wheelhouse.is_symlink():
        raise ValueError("Missing private Wheel directory")
    files = list(wheelhouse.iterdir())
    if {p.name for p in files} != set(expected) or len(files) != len(expected):
        raise ValueError("Archive directory differs from approved hash report")
    details = [inspect_wheel(wheelhouse / name, digest)
               for name, digest in sorted(expected.items())]
    return {
        "schemaVersion": 1,
        "source": "original version-pinned PyPI wheel ZIPs after registry SHA-256 verification",
        "platform": source.get("nativePlatform"),
        "python": source.get("candidatePython"),
        "packageCount": len(details),
        "noticeFileCount": sum(len(item["noticeFiles"]) for item in details),
        "nativeBinaryCount": sum(len(item["nativeBinaryFiles"]) for item in details),
        "declaredLicenseFileCount": sum(len(item["declaredLicenseFiles"]) for item in details),
        "missingDeclaredLicenseFileCount": sum(
            len(item["missingDeclaredLicenseFiles"]) for item in details
        ),
        "licenseApproved": False,
        "thirdPartyNoticeObligationsApproved": False,
        "modelRightsApproved": False,
        "buildProvenanceAttested": False,
        "packages": details,
    }


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit("Expected: <private-wheelhouse> <verified-digest-report.json> <output.json>")
    wheelhouse, report, output = map(Path, sys.argv[1:])
    if not output.is_absolute() or output.exists():
        raise SystemExit("Output must be a new absolute path")
    data = collect(wheelhouse, report)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("x", encoding="utf-8") as target:
        json.dump(data, target, indent=2, ensure_ascii=False)
        target.write("\n")
    print(
        f"Original ZIP evidence: {data['packageCount']} Wheels, "
        f"{data['noticeFileCount']} indexed license/notice members, "
        f"{data['nativeBinaryCount']} native binary members, "
        f"{data['declaredLicenseFileCount']} declared license files, "
        f"{data['missingDeclaredLicenseFileCount']} missing declared file paths; "
        "all legal/provenance decisions still require independent review."
    )


if __name__ == "__main__":
    main()
