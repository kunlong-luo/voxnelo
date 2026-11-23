import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const workflow=readFileSync('.github/workflows/moonshine-wheel-digest-matrix.yml','utf8');
const auditor=readFileSync('scripts/audit-moonshine-wheelhouse.py','utf8');

describe('read-only Python Wheel registry-digest candidate audit',()=>{
  it('runs only on its own changed sources or deliberate dispatch',()=>{
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain("'scripts/audit-moonshine-wheelhouse.py'");
    expect(workflow).toContain("'scripts/moonshine-python-constraints.txt'");
    expect(workflow).toContain('permissions:\n  contents: read');
    expect(workflow).not.toMatch(/\s+push:/);
    expect(workflow).not.toContain('schedule:');
  });
  it('keeps exact 3-platform Python 3.12 matrix and uploads JSON only',()=>{
    expect(workflow).toContain('ubuntu-24.04');
    expect(workflow).toContain('windows-latest');
    expect(workflow).toContain('macos-15');
    expect(workflow).toContain("python-version: '3.12'");
    expect(workflow).toContain('--constraint scripts/moonshine-python-constraints.txt');
    expect(workflow).toContain('python scripts/audit-moonshine-wheelhouse.py');
    expect(workflow).toContain('actions/upload-artifact@v7');
    expect(workflow).toContain('.json');
    expect(workflow).not.toContain('gh release');
  });
  it('records downloaded SHA-256 vs per-file PyPI checksum, not legal clearance',()=>{
    expect(auditor).toContain('hashlib.sha256()');
    expect(auditor).toContain("data.get('urls', [])");
    expect(auditor).toContain('pypiPublishedDigestMatched');
    expect(auditor).toContain("'buildProvenanceAttested': False");
    expect(auditor).toContain("'licenseApproved': False");
    expect(auditor).toContain("'humanMicAccepted': False");
  });
});
