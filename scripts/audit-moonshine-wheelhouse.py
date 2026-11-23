#!/usr/bin/env python3
"""Audit downloaded Python Wheel bytes against PyPI's *published* SHA-256.

Read-only report for the v1.0.4 Moonshine 0.0.65 candidate. This does NOT
establish build provenance, legal redistribution rights, signatures, or real
microphone quality. The user installer is intentionally not changed.
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import platform
import re
import sys
import time
from urllib.request import Request, urlopen

PIN = re.compile(
    r'^([A-Za-z0-9][A-Za-z0-9_.-]*)==([A-Za-z0-9][A-Za-z0-9.+-]*)'
    r'(?:;\s*sys_platform\s*==\s*"win32")?$'
)
WHEEL_NAME = re.compile(r'^[A-Za-z0-9][A-Za-z0-9_.-]*\.whl$')


def normalized(name: str) -> str:
    return re.sub(r'[-_.]+', '-', name).lower()


def parse_constraints(text: str, target: str) -> dict[str, str]:
    expected: dict[str, str] = {}
    for source in text.splitlines():
        line = source.strip()
        if not line or line.startswith('#'):
            continue
        match = PIN.fullmatch(line)
        if not match:
            raise ValueError('Unexpected unpinned or malformed requirement')
        name, version = normalized(match.group(1)), match.group(2)
        if ';' in line and target != 'win32':
            continue
        if name in expected:
            raise ValueError('Duplicate normalized dependency name')
        expected[name] = version
    if expected.get('moonshine-voice') != '0.0.65':
        raise ValueError('Pinned Moonshine runtime missing from snapshot')
    return expected


def downloaded_wheel_identity(filename: str) -> tuple[str, str]:
    if not WHEEL_NAME.fullmatch(filename):
        raise ValueError('Unexpected file in wheelhouse')
    components = filename[:-4].split('-')
    if len(components) not in (5, 6):
        raise ValueError('Invalid wheel distribution filename')
    return normalized(components[0]), components[1]


def publisher_registry_digest(name: str, version: str, filename: str) -> str:
    """A registry checksum claim, not a signed build attestation."""
    url = f'https://pypi.org/pypi/{name}/{version}/json'
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            with urlopen(Request(url, headers={
                'User-Agent': 'Voxnelo-wheel-evidence/1.0',
                'Accept': 'application/json',
            }), timeout=20) as response:
                data = json.load(response)
            candidates = [
                str(item.get('digests', {}).get('sha256', ''))
                for item in data.get('urls', [])
                if item.get('filename') == filename
            ]
            if len(candidates) != 1 or not re.fullmatch(r'[a-f0-9]{64}', candidates[0]):
                raise ValueError('Exact Wheel file missing from versioned PyPI record')
            return candidates[0]
        except (OSError, TimeoutError, ValueError) as exc:
            last_error = exc
            if attempt < 2:
                time.sleep(2 * (attempt + 1))
    raise RuntimeError('PyPI fixed-version checksum lookup unavailable') from last_error


def sha256_file(filename: Path) -> str:
    digest = hashlib.sha256()
    with filename.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1 << 20), b''):
            digest.update(chunk)
    return digest.hexdigest()


def audit(directory: Path, constraints: Path) -> dict:
    if sys.version_info[:2] != (3, 12):
        raise ValueError('Only Python 3.12 candidate wheel hashes may be recorded')
    target = sys.platform
    if target not in ('win32', 'linux', 'darwin'):
        raise ValueError('Unsupported OS')
    expected = parse_constraints(constraints.read_text(encoding='utf-8'), target)
    root = directory.resolve(strict=True)
    files = sorted(directory.iterdir(), key=lambda item: item.name)
    if not files or not root.is_dir():
        raise ValueError('Empty or missing Wheel directory')
    seen: set[str] = set()
    records: list[dict] = []
    for item in files:
        if item.is_symlink() or not item.is_file():
            raise ValueError('Non-regular Wheel entry detected')
        name, version = downloaded_wheel_identity(item.name)
        if name in seen or expected.get(name) != version:
            raise ValueError('Unexpected, duplicate or unpinned Wheel')
        seen.add(name)
        digest = sha256_file(item)
        official = publisher_registry_digest(name, version, item.name)
        if digest != official:
            raise ValueError('Downloaded Wheel SHA-256 differs from PyPI release record')
        records.append({
            'name': name,
            'version': version,
            'filename': item.name,
            'sha256': digest,
            'pypiPublishedDigestMatched': True,
        })
    if set(expected) != seen:
        raise ValueError('Incomplete platform-specific pinned Wheel inventory')
    return {
        'schemaVersion': 1,
        'source': 'downloaded Wheel bytes compared to fixed-version PyPI records',
        'candidatePython': '3.12',
        'nativePlatform': target,
        'architecture': platform.machine().lower(),
        'sourceCommit': os.environ.get('GITHUB_SHA', '')[:40],
        'wheelCount': len(records),
        'wheels': records,
        'buildProvenanceAttested': False,
        'licenseApproved': False,
        'humanMicAccepted': False,
    }


def verify_committed_snapshot(report: dict, snapshot: Path) -> None:
    """Require the reviewed source-tracked digest list to equal downloaded bytes."""
    data = json.loads(snapshot.read_text(encoding='utf-8'))
    if (data.get('schemaVersion') != 1 or
            data.get('candidatePython') != '3.12' or
            data.get('buildProvenanceAttested') is not False or
            data.get('licenseApproved') is not False or
            data.get('userInstallerHashLocked') is not False):
        raise ValueError('Malformed or misleading Wheel digest snapshot')
    target = report['nativePlatform']
    recorded = data.get('platforms', {}).get(target)
    actual = {row['filename']: row['sha256'] for row in report['wheels']}
    if not isinstance(recorded, dict) or recorded != actual:
        raise ValueError('Downloaded Wheels differ from committed SHA-256 evidence')


def main() -> None:
    if len(sys.argv) != 5:
        raise SystemExit('Expected: <wheelhouse> <pinned-constraints> <output.json> <committed-snapshot.json>')
    root, constraints, output, snapshot = map(Path, sys.argv[1:])
    if not output.is_absolute() or output.exists():
        raise SystemExit('Output must be a new, absolute path')
    data = audit(root, constraints)
    verify_committed_snapshot(data, snapshot)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open('x', encoding='utf-8') as stream:
        json.dump(data, stream, indent=2, ensure_ascii=False)
        stream.write('\n')
    print('Verified registry-published SHA-256 values for '
          f'{data["wheelCount"]} downloaded {data["nativePlatform"]} Wheels; '
          'not a provenance or license approval.')


if __name__ == '__main__':
    main()
