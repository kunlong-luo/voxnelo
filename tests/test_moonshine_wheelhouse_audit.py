#!/usr/bin/env python3
"""Offline regression for the Wheel SHA-256 evidence collector; no PyPI access."""
import hashlib
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts' / 'audit-moonshine-wheelhouse.py'
SPEC = importlib.util.spec_from_file_location('voxnelo_wheel_audit', SCRIPT)
assert SPEC and SPEC.loader
mod = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mod)


class WheelAuditTests(unittest.TestCase):
    def test_pinned_platform_constraints(self):
        text = (
            '# private copy of the minimal source snapshot\n'
            'moonshine-voice==0.0.65\n'
            'colorama==0.4.6; sys_platform == "win32"\n'
        )
        self.assertEqual(mod.parse_constraints(text, 'linux'),
                         {'moonshine-voice': '0.0.65'})
        self.assertEqual(mod.parse_constraints(text, 'win32'),
                         {'moonshine-voice': '0.0.65', 'colorama': '0.4.6'})
        with self.assertRaises(ValueError):
            mod.parse_constraints('moonshine-voice>=0.0.65', 'linux')
        with self.assertRaises(ValueError):
            mod.parse_constraints('moonshine-voice==0.0.65\nmoonshine_voice==0.0.65', 'linux')

    def test_wheel_filename_identity_and_path_safety(self):
        self.assertEqual(
            mod.downloaded_wheel_identity('moonshine_voice-0.0.65-py3-none-win_amd64.whl'),
            ('moonshine-voice', '0.0.65'),
        )
        self.assertEqual(
            mod.downloaded_wheel_identity('numpy-2.5.5-cp312-cp312-manylinux_2_34_x86_64.whl'),
            ('numpy', '2.5.5'),
        )
        for name in ('../bad.whl', 'unexpected.txt', 'bad.whl', '.hidden.whl'):
            with self.assertRaises(ValueError):
                mod.downloaded_wheel_identity(name)

    def test_incomplete_or_corrupt_wheelhouse_cannot_pass(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            lock = root / 'requirements.txt'
            lock.write_text('moonshine-voice==0.0.65\n', encoding='utf-8')
            wheels = root / 'whls'
            wheels.mkdir()
            with self.assertRaises(ValueError):
                mod.audit(wheels, lock)
            filename = 'moonshine_voice-0.0.65-py3-none-any.whl'
            wheel = wheels / filename
            wheel.write_bytes(b'test-only not an actual wheel')
            good = hashlib.sha256(wheel.read_bytes()).hexdigest()
            with patch.object(mod, 'publisher_registry_digest', return_value=good):
                result = mod.audit(wheels, lock)
                self.assertEqual(result['wheelCount'], 1)
                self.assertEqual(result['wheels'][0]['sha256'], good)
                self.assertFalse(result['buildProvenanceAttested'])
                self.assertFalse(result['licenseApproved'])
            with patch.object(mod, 'publisher_registry_digest', return_value='0'*64):
                with self.assertRaises(ValueError):
                    mod.audit(wheels, lock)
            (wheels / 'extra.txt').write_text('bad', encoding='utf-8')
            with patch.object(mod, 'publisher_registry_digest', return_value=good):
                with self.assertRaises(ValueError):
                    mod.audit(wheels, lock)

    def test_committed_snapshot_must_match_exact_file_and_hash(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'snapshot.json'
            report = {
                'nativePlatform': 'linux',
                'wheels': [{
                    'filename': 'moonshine_voice-0.0.65-py3-none-any.whl',
                    'sha256': 'a' * 64,
                }],
            }
            snapshot = {
                'schemaVersion': 1,
                'candidatePython': '3.12',
                'buildProvenanceAttested': False,
                'licenseApproved': False,
                'userInstallerHashLocked': False,
                'platforms': {'linux': {
                    'moonshine_voice-0.0.65-py3-none-any.whl': 'a' * 64,
                }},
            }
            import json
            path.write_text(json.dumps(snapshot), encoding='utf-8')
            mod.verify_committed_snapshot(report, path)
            report['wheels'][0]['sha256'] = 'b' * 64
            with self.assertRaises(ValueError):
                mod.verify_committed_snapshot(report, path)
            report['wheels'][0]['sha256'] = 'a' * 64
            snapshot['licenseApproved'] = True
            path.write_text(json.dumps(snapshot), encoding='utf-8')
            with self.assertRaises(ValueError):
                mod.verify_committed_snapshot(report, path)


if __name__ == '__main__':
    unittest.main()
