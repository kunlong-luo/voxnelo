import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const attrs=readFileSync('.gitattributes','utf8');
const archived=[
  'publish-linux-v0.1.5.yml',
  'publish-all-v0.1.6.yml',
  'prepare-v0.1.7-draft-once.yml',
  'publish-all-v1.0.0.yml',
  'publish-all-v1.0.1.yml',
  'publish-all-v1.0.2.yml',
  'publish-all-v1.0.3.yml',
];

describe('cross-platform source checkout byte stability',()=>{
  it('forces Unix LF for workflow sources and exact Python dependency snapshots',()=>{
    for(const ext of ['yml','yaml','txt','ts','tsx','mts','py','json'])
      expect(attrs).toMatch(new RegExp('^\\*\\.'+ext+' text eol=lf$', 'm'));
  });
  it('protects the distributed first-party MIT LICENSE from CRLF conversion',()=>{
    expect(attrs).toMatch(/^LICENSE text eol=lf$/m);
    const notice=readFileSync('LICENSE');
    expect(notice.includes(13),'CR byte in packaged first-party MIT LICENSE').toBe(false);
    expect(notice.at(-1)).toBe(10);
    expect(notice.toString('utf8')).toMatch(/^MIT License\n/);
  });

  it('keeps original archive Git blob content unchanged by Windows core.autocrlf',()=>{
    for(const name of archived){
      const source=readFileSync('docs/archive/workflows/'+name);
      expect(source.includes(13),'CR byte in immutable archived workflow '+name).toBe(false);
      expect(source.toString('utf8')).toContain('workflow_dispatch:');
    }
  });
  it('preserves exact LF content of required main CI YAML and Python requirements',()=>{
    for(const filename of [
      '.github/workflows/ci.yml',
      '.github/workflows/v1.0.4-review-installers.yml',
      '.github/workflows/moonshine-native-matrix.yml',
      'scripts/moonshine-python-constraints.txt',
    ]){
      const file=readFileSync(filename);
      expect(file.includes(13),'CR byte in protected input '+filename).toBe(false);
      expect(file.at(-1)).toBe(10);
    }
  });
});
