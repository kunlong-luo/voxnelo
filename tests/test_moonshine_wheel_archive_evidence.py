#!/usr/bin/env python3
"""Offline tests for original Wheel archive legal-evidence collection."""
import hashlib
import importlib.util
import json
from pathlib import Path
import stat
import tempfile
import unittest
from zipfile import ZipFile, ZipInfo

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts' / 'collect-moonshine-wheel-archive-evidence.py'
SPEC = importlib.util.spec_from_file_location('voxnelo_wheel_legal', SCRIPT)
assert SPEC and SPEC.loader
mod = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mod)


def make_wheel(root: Path, name: str, entries=None):
    filename = f'{name}-0.0.65-py3-none-any.whl'
    wheel = root / filename
    data = {
        f'{name}-0.0.65.dist-info/METADATA':
            f'Metadata-Version: 2.4\nName: {name}\nVersion: 0.0.65\n'
            'License-Expression: MIT\nLicense-File: LICENSE\n',
        f'{name}-0.0.65.dist-info/licenses/LICENSE': 'Test-only simulated notice',
        f'{name}/native.so': b'test-only native library',
    }
    data.update(entries or {})
    with ZipFile(wheel, 'w') as archive:
        for path, payload in data.items():
            archive.writestr(path, payload)
    digest = hashlib.sha256(wheel.read_bytes()).hexdigest()
    return wheel, digest


class WheelArchiveEvidenceTests(unittest.TestCase):
    def test_captures_zip_license_file_hash_and_native_byte_hash(self):
        with tempfile.TemporaryDirectory() as root:
            wheel, digest = make_wheel(Path(root), 'moonshine_voice')
            item = mod.inspect_wheel(wheel, digest)
            self.assertEqual(item['name'], 'moonshine-voice')
            self.assertEqual(item['version'], '0.0.65')
            self.assertEqual(item['licenseExpression'], 'MIT')
            self.assertEqual(item['declaredLicenseFiles'], ['LICENSE'])
            self.assertEqual(len(item['noticeFiles']), 1)
            self.assertEqual(len(item['nativeBinaryFiles']), 1)
            self.assertFalse(item.get('licenseApproved', False))
            self.assertTrue(item['manualReviewRequired'])
            self.assertEqual(
                item['nativeBinaryFiles'][0]['sha256'],
                hashlib.sha256(b'test-only native library').hexdigest(),
            )

    def test_pep639_nested_and_non_keyword_license_files_are_found(self):
        with tempfile.TemporaryDirectory() as root:
            name = 'moonshine_voice'
            prefix = f'{name}-0.0.65.dist-info'
            wheel, digest = make_wheel(Path(root), name, {
                f'{prefix}/METADATA': (
                    f'Metadata-Version: 2.4\nName: {name}\nVersion: 0.0.65\n'
                    'License-Expression: MIT\n'
                    'License-File: LICENSE\n'
                    'License-File: deps/Apache-2.0.txt\n'
                    'License-File: AUTHORS\n'
                ),
                f'{prefix}/licenses/deps/Apache-2.0.txt': 'Synthetic license text',
                f'{prefix}/licenses/AUTHORS': 'Synthetic attribution text',
                f'{prefix}/licenses/ThirdParty.md': 'Undeclared synthetic notice',
            })
            item = mod.inspect_wheel(wheel, digest)
            self.assertTrue(item['pep639LicenseLayoutRequired'])
            self.assertTrue(item['declaredLicenseFilesLocated'])
            self.assertEqual(item['missingDeclaredLicenseFiles'], [])
            self.assertEqual(len(item['declaredLicenseFiles']), 3)
            license_paths = {x['path'] for x in item['noticeFiles']}
            self.assertIn(f'{prefix}/licenses/deps/Apache-2.0.txt', license_paths)
            self.assertIn(f'{prefix}/licenses/AUTHORS', license_paths)
            self.assertIn(f'{prefix}/licenses/ThirdParty.md', license_paths)
            self.assertEqual(
                item['declaredLicenseArchivePaths']['deps/Apache-2.0.txt'],
                f'{prefix}/licenses/deps/Apache-2.0.txt',
            )
            self.assertTrue(item['manualReviewRequired'])

    def test_missing_declared_license_is_explicit_pending_not_approval(self):
        with tempfile.TemporaryDirectory() as root:
            prefix = 'numpy-0.0.65.dist-info'
            wheel, digest = make_wheel(Path(root), 'numpy', {
                f'{prefix}/METADATA': (
                    'Metadata-Version: 2.4\nName: numpy\nVersion: 0.0.65\n'
                    'License-File: LICENSE\nLicense-File: missing/NOTICE.txt\n'
                ),
            })
            item = mod.inspect_wheel(wheel, digest)
            self.assertFalse(item['declaredLicenseFilesLocated'])
            self.assertEqual(item['missingDeclaredLicenseFiles'], ['missing/NOTICE.txt'])
            self.assertTrue(item['manualReviewRequired'])
            self.assertNotIn('licenseApproved', item)

    def test_rejects_unsafe_duplicate_pep639_license_declarations(self):
        with tempfile.TemporaryDirectory() as root:
            prefix = 'numpy-0.0.65.dist-info'
            for lines in [
                'License-File: ../private.txt\n',
                'License-File: /absolute.txt\n',
                'License-File: LICENSE\nLicense-File: LICENSE\n',
            ]:
                wheel, digest = make_wheel(Path(root), 'numpy', {
                    f'{prefix}/METADATA': (
                        'Metadata-Version: 2.4\nName: numpy\n'
                        'Version: 0.0.65\n' + lines
                    ),
                })
                with self.assertRaises(ValueError):
                    mod.inspect_wheel(wheel, digest)
                wheel.unlink()

    def test_rejects_tampering_missing_or_misidentified_metadata(self):
        with tempfile.TemporaryDirectory() as root:
            wheel, digest = make_wheel(Path(root), 'numpy')
            with self.assertRaises(ValueError):
                mod.inspect_wheel(wheel, '0' * 64)
            with ZipFile(wheel, 'a') as target:
                target.writestr('extra-file', 'new bytes')
            with self.assertRaises(ValueError):
                mod.inspect_wheel(wheel, digest)
            wheel.unlink()
            wheel, digest = make_wheel(Path(root), 'numpy', {
                'numpy-0.0.65.dist-info/METADATA':
                    'Metadata-Version: 2.4\nName: NOT-NUMPY\nVersion: 0.0.65\n',
            })
            with self.assertRaises(ValueError):
                mod.inspect_wheel(wheel, digest)

    def test_rejects_zip_member_traversal_and_symlink(self):
        with tempfile.TemporaryDirectory() as root:
            wheel, _ = make_wheel(Path(root), 'numpy', {'../escape': 'bad'})
            digest = hashlib.sha256(wheel.read_bytes()).hexdigest()
            with self.assertRaises(ValueError):
                mod.inspect_wheel(wheel, digest)
            wheel.unlink()
            wheel, _ = make_wheel(Path(root), 'numpy')
            with ZipFile(wheel, 'a') as z:
                link = ZipInfo('numpy/link.so')
                link.create_system = 3
                link.external_attr = (stat.S_IFLNK | 0o777) << 16
                z.writestr(link, 'fake symlink')
            digest = hashlib.sha256(wheel.read_bytes()).hexdigest()
            with self.assertRaises(ValueError):
                mod.inspect_wheel(wheel, digest)

    def test_collect_requires_complete_sha_verified_platform_inventory(self):
        with tempfile.TemporaryDirectory() as root:
            base = Path(root)
            whl = base / 'wheelhouse'
            whl.mkdir()
            records = []
            for i in range(13):
                wheel, digest = make_wheel(whl, f'package{i}')
                records.append({
                    'filename': wheel.name,
                    'sha256': digest,
                    'pypiPublishedDigestMatched': True,
                })
            source = {
                'schemaVersion': 1,
                'nativePlatform': 'linux',
                'candidatePython': '3.12',
                'buildProvenanceAttested': False,
                'licenseApproved': False,
                'humanMicAccepted': False,
                'wheels': records,
            }
            report = base / 'digests.json'
            report.write_text(json.dumps(source), encoding='utf-8')
            outcome = mod.collect(whl, report)
            self.assertEqual(outcome['packageCount'], 13)
            self.assertFalse(outcome['licenseApproved'])
            self.assertFalse(outcome['thirdPartyNoticeObligationsApproved'])
            self.assertEqual(len(outcome['packages']), 13)
            self.assertEqual(outcome['noticeFileCount'], 13)
            self.assertEqual(outcome['nativeBinaryCount'], 13)
            self.assertEqual(outcome['declaredLicenseFileCount'], 13)
            self.assertEqual(outcome['missingDeclaredLicenseFileCount'], 0)
            source['wheels'][0]['pypiPublishedDigestMatched'] = False
            report.write_text(json.dumps(source), encoding='utf-8')
            with self.assertRaises(ValueError):
                mod.collect(whl, report)
            source['wheels'][0]['pypiPublishedDigestMatched'] = True
            report.write_text(json.dumps(source), encoding='utf-8')
            (whl / 'unapproved.whl').write_text('bad', encoding='utf-8')
            with self.assertRaises(ValueError):
                mod.collect(whl, report)


if __name__ == '__main__':
    unittest.main()
