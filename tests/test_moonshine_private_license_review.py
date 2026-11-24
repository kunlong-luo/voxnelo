#!/usr/bin/env python3
"""Synthetic-only regression: private original Wheel license text export."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import stat
import tempfile
import unittest
from unittest.mock import patch

from test_moonshine_wheel_archive_evidence import make_wheel

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts' / 'prepare-moonshine-private-license-review.py'
SPEC = importlib.util.spec_from_file_location('private_moonshine_review', SCRIPT)
assert SPEC and SPEC.loader
review = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(review)


def fixtures(root: Path):
    wheels = root / 'wheels'
    wheels.mkdir()
    versions = {}
    records = []
    for i in range(13):
        name = f'syntheticpackage{i}'
        extras = None
        if i == 0:
            prefix = f'{name}-0.0.65.dist-info'
            extras = {
                f'{prefix}/METADATA': (
                    f'Metadata-Version: 2.4\nName: {name}\nVersion: 0.0.65\n'
                    'License-File: LICENSE\nLicense-File: AUTHORS\n'
                ),
                f'{prefix}/licenses/AUTHORS': b'private original bytes \xff\xfe',
            }
        wheel, digest = make_wheel(wheels, name, extras)
        versions[wheel.name] = digest
        records.append({
            'name': name, 'version': '0.0.65', 'filename': wheel.name,
            'sha256': digest, 'pypiPublishedDigestMatched': True,
        })
    report = {
        'schemaVersion': 1, 'nativePlatform': 'linux',
        'candidatePython': '3.12', 'wheelCount': len(records),
        'wheels': records, 'buildProvenanceAttested': False,
        'licenseApproved': False, 'humanMicAccepted': False,
    }
    snapshot = {
        'schemaVersion': 1, 'candidatePython': '3.12',
        'buildProvenanceAttested': False,
        'licenseApproved': False, 'userInstallerHashLocked': False,
        'platforms': {'linux': versions},
    }
    report_file = root / 'verified-digests.json'
    snapshot_file = root / 'committed-snapshot.json'
    report_file.write_text(json.dumps(report), encoding='utf-8')
    snapshot_file.write_text(json.dumps(snapshot), encoding='utf-8')
    return wheels, report_file, snapshot_file, report, snapshot


class PrivateLicenseReviewTests(unittest.TestCase):
    def test_exports_original_bytes_privately_and_never_approves_any_gate(self):
        with tempfile.TemporaryDirectory() as temp:
            # Resolve macOS /var -> /private/var before testing no-symlink outputs.
            root = Path(temp).resolve()
            wheels, report, snapshot, _, _ = fixtures(root)
            destination = root / 'private-review'
            result = review.prepare(wheels, report, snapshot, destination)
            self.assertEqual(result['packageCount'], 13)
            self.assertEqual(result['exportedLegalFileCount'], 14)
            self.assertFalse(result['licenseApproved'])
            self.assertFalse(result['noticeObligationsApproved'])
            self.assertFalse(result['modelRightsApproved'])
            self.assertFalse(result['releaseApproved'])
            self.assertTrue(result['reviewRequired'])
            record = json.loads((destination / 'REVIEW-INDEX.json').read_text())
            self.assertEqual(record['schemaVersion'], 1)
            self.assertTrue(all(pkg['reviewStatus'] == 'PENDING'
                                for pkg in record['packages']))
            self.assertTrue(all(pkg['nativeBinaryFiles']
                                for pkg in record['packages']))
            self.assertEqual(len(list((destination / 'raw-text').glob('*.raw'))), 27)
            first = record['packages'][0]
            self.assertEqual(first['name'], 'syntheticpackage0')
            original_metadata = next(
                item for item in first['localLegalText']
                if item['type'] == 'core-metadata'
            )
            self.assertEqual(first['metadataSha256'], original_metadata['sha256'])
            self.assertEqual(
                hashlib.sha256((destination / original_metadata['localFile']).read_bytes()).hexdigest(),
                first['metadataSha256'],
            )
            authors = next(item for item in first['localLegalText']
                           if item['archiveMember'].endswith('/AUTHORS'))
            extracted = (destination / authors['localFile']).read_bytes()
            self.assertEqual(extracted, b'private original bytes \xff\xfe')
            self.assertEqual(hashlib.sha256(extracted).hexdigest(), authors['sha256'])
            self.assertFalse(any(p.name.endswith('.so')
                                 for p in (destination / 'raw-text').iterdir()))
            if os.name != 'nt':
                self.assertEqual(stat.S_IMODE(destination.stat().st_mode), 0o700)
                self.assertTrue(all(
                    stat.S_IMODE(p.stat().st_mode) == 0o600
                    for p in (destination / 'raw-text').iterdir()
                ))

    def test_refuses_unpinned_digest_or_claimed_legal_approval_without_output(self):
        with tempfile.TemporaryDirectory() as temp:
            # Resolve macOS /var -> /private/var before testing no-symlink outputs.
            root = Path(temp).resolve()
            wheels, report_file, snapshot_file, report, snapshot = fixtures(root)
            target = root / 'blocked'
            snapshot['platforms']['linux'][report['wheels'][0]['filename']] = '0' * 64
            snapshot_file.write_text(json.dumps(snapshot), encoding='utf-8')
            with self.assertRaises(ValueError):
                review.prepare(wheels, report_file, snapshot_file, target)
            self.assertFalse(target.exists())
            snapshot['platforms']['linux'][report['wheels'][0]['filename']] = \
                report['wheels'][0]['sha256']
            snapshot_file.write_text(json.dumps(snapshot), encoding='utf-8')
            report['licenseApproved'] = True
            report_file.write_text(json.dumps(report), encoding='utf-8')
            with self.assertRaises(ValueError):
                review.prepare(wheels, report_file, snapshot_file, target)
            self.assertFalse(target.exists())

    def test_rejects_missing_declared_member_and_bad_destination(self):
        with tempfile.TemporaryDirectory() as temp:
            # Resolve macOS /var -> /private/var before testing no-symlink outputs.
            root = Path(temp).resolve()
            wheels, report_file, snapshot_file, report, snapshot = fixtures(root)
            first = report['wheels'][0]
            wheel = wheels / first['filename']
            prefix = 'syntheticpackage0-0.0.65.dist-info'
            # Reconstruct the original synthetic fixture, removing AUTHORS
            # while retaining a META declaration: the local review must HOLD.
            wheel.unlink()
            wheel, digest = make_wheel(wheels, 'syntheticpackage0', {
                f'{prefix}/METADATA': (
                    'Metadata-Version: 2.4\nName: syntheticpackage0\n'
                    'Version: 0.0.65\nLicense-File: LICENSE\n'
                    'License-File: AUTHORS\n'
                ),
            })
            first['sha256'] = digest
            snapshot['platforms']['linux'][wheel.name] = digest
            report_file.write_text(json.dumps(report), encoding='utf-8')
            snapshot_file.write_text(json.dumps(snapshot), encoding='utf-8')
            target = root / 'pending'
            with self.assertRaisesRegex(ValueError, 'declarations incomplete'):
                review.prepare(wheels, report_file, snapshot_file, target)
            self.assertFalse(target.exists())
            with self.assertRaises(ValueError):
                review.prepare(wheels, report_file, snapshot_file, Path('relative'))
            with self.assertRaises(ValueError):
                review.prepare(wheels, report_file, snapshot_file,
                               review.ROOT / 'private-moonshine-license-review-forbidden')

    def test_rejects_changed_metadata_between_scan_and_export_and_cleans_output(self):
        with tempfile.TemporaryDirectory() as temp:
            # Resolve macOS /var -> /private/var before testing no-symlink outputs.
            root = Path(temp).resolve()
            wheels, report, snapshot, _, _ = fixtures(root)
            destination = root / 'private-review'
            actual_collect = review.collector.collect

            def altered_scanner(*args):
                result = actual_collect(*args)
                result['packages'][0]['metadataSha256'] = '0' * 64
                return result

            with patch.object(review.collector, 'collect', side_effect=altered_scanner):
                with self.assertRaisesRegex(ValueError, 'ZIP entry changed'):
                    review.prepare(wheels, report, snapshot, destination)
            self.assertFalse(destination.exists())

    def test_detects_whole_wheel_drift_during_export_and_cleans_output(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp).resolve()
            wheels, report, snapshot, _, _ = fixtures(root)
            destination = root / 'private-review'
            original_zipfile = review.ZipFile

            class ZipThatDriftsAfterRead:
                def __init__(self, wheel):
                    self.wheel = Path(wheel)
                    self.zipped = original_zipfile(wheel)

                def __enter__(self):
                    return self.zipped.__enter__()

                def __exit__(self, *args):
                    result = self.zipped.__exit__(*args)
                    with self.wheel.open('ab') as output:
                        output.write(b'synthetic unexpected trailing ZIP bytes')
                    return result

            with patch.object(review, 'ZipFile', ZipThatDriftsAfterRead):
                with self.assertRaisesRegex(ValueError, 'changed during local text export'):
                    review.prepare(wheels, report, snapshot, destination)
            self.assertFalse(destination.exists())

    def test_refuses_symlink_in_any_output_ancestor(self):
        with tempfile.TemporaryDirectory() as temp:
            # Resolve macOS /var -> /private/var before testing no-symlink outputs.
            root = Path(temp).resolve()
            wheels, report, snapshot, _, _ = fixtures(root)
            actual = root / 'underlying'
            (actual / 'child').mkdir(parents=True)
            link = root / 'symlinked'
            try:
                link.symlink_to(actual, target_is_directory=True)
            except (OSError, NotImplementedError):
                self.skipTest('This runner cannot create a directory symlink')
            destination = link / 'child' / 'private-review'
            # The immediate parent is a normal directory; a higher ancestor
            # is the symlink. Reject before creating any review output.
            self.assertFalse(destination.parent.is_symlink())
            with self.assertRaisesRegex(ValueError, 'non-symlink ancestors'):
                review.prepare(wheels, report, snapshot, destination)
            self.assertFalse((actual / 'child' / 'private-review').exists())


if __name__ == '__main__':
    unittest.main()
