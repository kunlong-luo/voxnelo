import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const license=readFileSync('docs/engineering/MOONSHINE-V1.0.4-LICENSE-EVIDENCE.md','utf8');
const gate=readFileSync('docs/engineering/ASR-PUBLIC-RELEASE-GATE.md','utf8');

describe('v1.0.4 Moonshine rights and release-approval boundaries',()=>{
  it('records pinned package and official English model license separately from unverified wheel dependencies',()=>{
    expect(license).toContain('moonshine-voice==0.0.65');
    expect(license).toContain('https://pypi.org/project/moonshine-voice/0.0.65/');
    expect(license).toContain('https://github.com/moonshine-ai/moonshine/blob/main/LICENSE');
    expect(license).toContain('English Medium Streaming');
    expect(license).toContain('third-party');
    expect(license).toContain('PARTIAL EVIDENCE ONLY');
    expect(license).toContain('No user audio');
  });
  it('does not confuse owner-approved unsigned installation with all-platform ASR approval',()=>{
    expect(gate).toContain('NOT APPROVED FOR PUBLICATION');
    expect(gate).toContain('unsigned');
    expect(gate).toContain('signature is optional');
    expect(gate).toContain('Pending');
    expect(gate).toContain('MOONSHINE-V1.0.4-LICENSE-EVIDENCE.md');
    expect(gate).toContain('HOLD public v1.0.4');
    expect(gate).toContain('4aeb58e');
    expect(license).toContain('draft=true');
    expect(license).toContain('published_at=null');
    expect(license).toContain('v1.0.3');
  });
});
