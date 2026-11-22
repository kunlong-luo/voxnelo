import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const python=readFileSync('scripts/collect-moonshine-license-metadata.py','utf8');
const exporter=readFileSync('scripts/export-moonshine-license-inventory.mts','utf8');
const workflow=readFileSync('.github/workflows/moonshine-native-matrix.yml','utf8');

describe('Moonshine per-OS installed Python license inventory (not legal approval)',()=>{
  it('uses installed distribution metadata only, with no audio/model/network access',()=>{
    expect(python).toContain('import importlib.metadata as metadata');
    expect(python).toContain('metadata.distributions()');
    expect(python).toContain('licenseApproved": False');
    expect(python).toContain('copyrightAndRedistributionReviewed": False');
    expect(python).toContain('nativeBinaryFiles');
    expect(python).toContain('noticeFiles');
    expect(python).toContain('needsManualLicenseClassification');
    expect(python).toContain('candidate.relative_to(root)');
    expect(python).not.toContain('requests.');
    expect(python).not.toContain('urllib.request');
    expect(python).not.toContain('subprocess.');
    expect(python).not.toContain('moonshine_voice.download');
  });
  it('runs in the existing isolated personal venv, rejects private paths and overwrites',()=>{
    expect(exporter).toContain('scripts/collect-moonshine-license-metadata.py');
    expect(exporter).toContain("'-I'");
    expect(exporter).toContain("pkg.version==='0.0.65'");
    expect(exporter).toContain('serialized.includes(homedir())');
    expect(exporter).toContain("flag:'wx'");
    expect(exporter).not.toContain('pip install');
  });
  it('exports per-runner evidence only after the opt-in genuine native install',()=>{
    expect(workflow).toContain('scripts/export-moonshine-license-inventory.mts');
    expect(workflow).toContain('moonshine-license-${{ matrix.target }}');
    expect(workflow).toContain('retention-days: 14');
    expect(workflow.indexOf('Explicitly install pinned native SDK'))
      .toBeLessThan(workflow.indexOf('Export installed Python license'));
    expect(workflow.indexOf('Export installed Python license'))
      .toBeLessThan(workflow.indexOf('Build real unpacked OS-native Electron application'));
  });
});
