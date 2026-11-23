import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {
  MOONSHINE_RUNTIME_DEPENDENCIES,
  moonshinePythonConstraints,
  verifyMoonshineCiPythonVersion,
  verifyMoonshineResolvedPackages,
} from '../apps/desktop/moonshinePythonDependencies.ts';

const mk=(platform:'linux'|'darwin'|'win32')=>
  Object.entries(MOONSHINE_RUNTIME_DEPENDENCIES)
    .filter(([name])=>name!=='colorama'||platform==='win32')
    .map(([name,version])=>[name,version]);

describe('Moonshine 0.0.65 Python dependency version guards',()=>{
  it('pins all 13 universal dependencies and Windows-only colorama in pip constraints',()=>{
    const text=moonshinePythonConstraints();
    expect(readFileSync('scripts/moonshine-python-constraints.txt','utf8')).toBe(text);
    expect(Object.keys(MOONSHINE_RUNTIME_DEPENDENCIES)).toHaveLength(14);
    for(const [name,version] of Object.entries(MOONSHINE_RUNTIME_DEPENDENCIES)){
      const requirement=name==='colorama'
        ?'colorama==0.4.6; sys_platform == "win32"'
        :name+'=='+version;
      expect(text).toContain(requirement);
    }
    expect(text).toContain('Hash locking still pending');
  });
  it('accepts only the observed complete installed package versions for each native OS',()=>{
    for(const platform of ['linux','win32','darwin'] as const){
      const packages=mk(platform);
      expect(verifyMoonshineResolvedPackages(packages,platform)).toBe(true);
      expect(verifyMoonshineResolvedPackages([['pip','25.0'],...packages],platform)).toBe(true);
      expect(verifyMoonshineResolvedPackages(packages.slice(1),platform)).toBe(false);
      expect(verifyMoonshineResolvedPackages([...packages,['new-dependency','1.0']],platform)).toBe(false);
      expect(verifyMoonshineResolvedPackages([...packages,['numpy','9.0']],platform)).toBe(false);
      expect(verifyMoonshineResolvedPackages(packages.map(([name,version])=>
        name==='numpy'?[name,'0.0.1']:[name,version]),platform)).toBe(false);
      expect(verifyMoonshineResolvedPackages(packages.map(([name,version])=>
        name==='charset-normalizer'?['charset_normalizer',version]:[name,version]),platform)).toBe(true);
    }
  });
  it('rejects missing/duplicate/malformed inventories and unintended platform colorama',()=>{
    expect(verifyMoonshineResolvedPackages(null,'linux')).toBe(false);
    expect(verifyMoonshineResolvedPackages([null],'linux')).toBe(false);
    expect(verifyMoonshineResolvedPackages([...mk('linux'),['colorama','0.4.6']],'linux')).toBe(false);
    expect(verifyMoonshineResolvedPackages(mk('linux'),'win32')).toBe(false);
    expect(verifyMoonshineResolvedPackages([...mk('linux'),['--flag','1']],'linux')).toBe(false);
  });
  it('requires Python 3.12 minor for the three native CI runners',()=>{
    expect(verifyMoonshineCiPythonVersion('3.12.10')).toBe(true);
    expect(verifyMoonshineCiPythonVersion('3.12.16')).toBe(true);
    for(const value of ['3.15.2','3.13.0','3.12','3.12.16.1',null,undefined,312])
      expect(verifyMoonshineCiPythonVersion(value)).toBe(false);
  });
  it('enforces pinning and checks before model installation or activation',()=>{
    const installer=readFileSync('scripts/install-moonshine-linux.mts','utf8');
    expect(installer).toContain("spawnSync('py',['-3.12','-m','venv',venv]");
    expect(installer).not.toContain("spawnSync('py',['-3','-m','venv',venv]");
    expect(installer).toContain('verifiedPython312Version(python)');
    expect(installer).toContain("verifiedPython312Version('python3.12')");
    expect(installer).toContain('moonshineHashedRequirements(wheels)');
    expect(installer).toContain("'--require-hashes'");
    expect(installer).toContain("'--no-index','--find-links',wheelhouse");
    expect(installer).toContain('verifyInstalledDependencies(python)');
    expect(installer.indexOf('verifyInstalledDependencies(python);'))
      .toBeLessThan(installer.indexOf("report('model-download')"));
    expect(installer).toContain("['-m','pip','check'");
  });
  it('makes actual per-platform CI fail on setup-Python drift',()=>{
    const workflow=readFileSync('.github/workflows/moonshine-native-matrix.yml','utf8');
    const exporter=readFileSync('scripts/export-moonshine-license-inventory.mts','utf8');
    expect(workflow).toContain("python-version: '3.12'");
    expect(workflow).toContain('--require-python-3.12');
    const audit=readFileSync('.github/workflows/security-dependency-audit.yml','utf8');
    expect(audit).toContain('--constraint scripts/moonshine-python-constraints.txt');
    expect(exporter).toContain('verifyMoonshineCiPythonVersion(data.pythonVersion)');
  });
});
