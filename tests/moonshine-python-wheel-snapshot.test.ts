import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {pinnedMoonshineWheel} from '../apps/desktop/moonshineWheelIntegrity.ts';

interface Snapshot {
  schemaVersion:number;candidatePython:string;
  buildProvenanceAttested:boolean;licenseApproved:boolean;
  userInstallerHashLocked:boolean;
  platforms:Record<string,Record<string,string>>;
}
const evidence=JSON.parse(readFileSync(
  'docs/engineering/moonshine-python312-wheel-digests-2026-11-23.json','utf8',
)) as Snapshot;

describe('archived exact Python 3.12 SDK/transitive wheel digests',()=>{
  it('records 13/14/13 registry-matched filenames, never a license approval',()=>{
    expect(evidence.schemaVersion).toBe(1);
    expect(evidence.candidatePython).toBe('3.12');
    expect(evidence.buildProvenanceAttested).toBe(false);
    expect(evidence.licenseApproved).toBe(false);
    expect(evidence.userInstallerHashLocked).toBe(false);
    for(const [target,count] of [['linux',13],['win32',14],['darwin',13]] as const){
      const files=evidence.platforms[target];
      expect(files).toBeDefined();
      expect(Object.keys(files)).toHaveLength(count);
      for(const [name,hash] of Object.entries(files!)){
        expect(name).toMatch(/^[A-Za-z0-9][A-Za-z0-9_.-]*\.whl$/);
        expect(hash).toMatch(/^[a-f0-9]{64}$/);
      }
    }
  });
  it('preserves the exact separately pinned Moonshine 0.0.65 SDK checksums',()=>{
    for(const [platform,arch,version] of [
      ['linux','x64','6.8.0'],['win32','x64','10.0.0'],['darwin','arm64','24.0.0'],
    ] as const){
      const wheel=pinnedMoonshineWheel(platform,arch,version);
      expect(wheel).not.toBeNull();
      expect(evidence.platforms[platform]?.[wheel!.filename]).toBe(wheel!.sha256);
    }
  });
  it('keeps the audit scoped and fail-closed on source-tracked digest drift',()=>{
    const workflow=readFileSync('.github/workflows/moonshine-wheel-digest-matrix.yml','utf8');
    const source=readFileSync('scripts/audit-moonshine-wheelhouse.py','utf8');
    expect(workflow).toContain('moonshine-python312-wheel-digests-2026-11-23.json');
    expect(source).toContain('verify_committed_snapshot(data, snapshot)');
    expect(source).toContain('recorded != actual');
    expect(workflow).not.toContain('gh release publish');
  });
});
