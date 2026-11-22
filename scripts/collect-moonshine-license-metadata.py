#!/usr/bin/env python3
"""Read-only, sanitized installed-distribution license metadata inventory.

Run with the opt-in Moonshine Python *venv* interpreter on each native CI runner.
No imports of Moonshine, model access, networking, source audio or host paths.
This is an evidence inventory, NEVER an automated redistribution approval.
"""

from __future__ import annotations

import hashlib
import importlib.metadata as metadata
import json
from pathlib import Path, PurePosixPath
import platform
import re
import sys

_LICENSE_FILE = re.compile(
    r"(?:licen[cs]e|licen[cs]es|notice|copying|copyright|third[-_]?party)",
    re.IGNORECASE,
)
_NATIVE_SUFFIXES = (".dll", ".dylib", ".pyd", ".so", ".a")


def safe_relative_name(item: object) -> str | None:
    name = str(item).replace("\\", "/")
    relative = PurePosixPath(name)
    if (not name or relative.is_absolute() or
            ".." in relative.parts or
            len(name) > 400 or
            any(ord(char) < 32 for char in name)):
        return None
    return relative.as_posix()


def notice_digest(dist: metadata.Distribution, item: object) -> str | None:
    try:
        root = Path(dist.locate_file("")).resolve(strict=True)
        candidate = Path(dist.locate_file(item)).resolve(strict=True)
        candidate.relative_to(root)
        if not candidate.is_file() or candidate.stat().st_size > 5_000_000:
            return None
        digest = hashlib.sha256()
        with candidate.open("rb") as stream:
            for block in iter(lambda: stream.read(65536), b""):
                digest.update(block)
        return digest.hexdigest()
    except (OSError, ValueError):
        return None


def inventory() -> dict:
    packages: list[dict] = []
    for dist in metadata.distributions():
        data = dist.metadata
        name = str(data.get("Name") or "").strip()
        version = str(dist.version or "").strip()
        if not name or not version:
            continue
        expression = str(data.get("License-Expression") or "").strip()
        if not re.fullmatch(r"[A-Za-z0-9 .+()_-]{1,200}", expression):
            expression = ""
        classifiers = sorted(set(
            str(value)[:240] for value in data.get_all("Classifier", [])
            if str(value).startswith("License ::")
        ))
        license_field = bool(data.get("License"))
        notices: list[dict] = []
        native: list[str] = []
        for item in dist.files or []:
            relative = safe_relative_name(item)
            if relative is None:
                continue
            lower = relative.lower()
            if _LICENSE_FILE.search(PurePosixPath(relative).name):
                notices.append({
                    "file": relative,
                    "sha256": notice_digest(dist, item),
                })
            if lower.endswith(_NATIVE_SUFFIXES) or ".so." in lower:
                native.append(relative)
        notices.sort(key=lambda entry: entry["file"])
        native.sort()
        packages.append({
            "name": name,
            "version": version,
            "licenseExpression": expression or None,
            "licenseFieldPresent": license_field,
            "licenseClassifiers": classifiers,
            "noticeFiles": notices,
            "nativeBinaryFiles": native,
            "needsManualLicenseClassification": not bool(
                expression or license_field or classifiers or notices
            ),
        })
    packages.sort(key=lambda entry: (entry["name"].casefold(), entry["version"]))
    if not any(item["name"].lower().replace("_", "-") == "moonshine-voice"
               and item["version"] == "0.0.65" for item in packages):
        raise RuntimeError("Pinned Moonshine 0.0.65 is not installed")
    return {
        "schemaVersion": 1,
        "source": "installed Python distribution metadata in private Moonshine venv",
        "licenseApproved": False,
        "copyrightAndRedistributionReviewed": False,
        "nativePlatform": platform.system().lower(),
        "architecture": platform.machine().lower(),
        "pythonVersion": ".".join(str(value) for value in sys.version_info[:3]),
        "packages": packages,
        "manualReviewRequired": [
            item["name"] + "==" + item["version"]
            for item in packages if item["needsManualLicenseClassification"]
        ],
    }


if __name__ == "__main__":
    print(json.dumps(inventory(), ensure_ascii=False, indent=2))
