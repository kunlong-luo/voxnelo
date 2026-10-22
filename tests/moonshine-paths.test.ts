import {describe,it,expect} from 'vitest';
import path from 'node:path';
import {resolveMoonshinePaths} from '../apps/desktop/moonshinePaths';

const base={platform:'linux',resourcesPath:'/opt/Voxnelo/resources',
  bundleDir:'/workspace/voxnelo/dist-electron',
  personalDataDir:'/home/user/.config/voxnelo'};
describe('Moonshine packaged desktop paths',()=>{
  it('uses only fixed packaged resources and private personal install',()=>{
    expect(resolveMoonshinePaths({...base,isPackaged:true,developerPython:'/tmp/untrusted/python',
      developerModelDir:'/tmp/untrusted/model'})).toEqual({
      scriptPath:path.join(base.resourcesPath,'moonshine','scripts','moonshine-stream-pilot.py'),
      validationScriptPath:path.join(base.resourcesPath,'moonshine','scripts','benchmark-moonshine-voice.py'),
      pythonPath:path.join(base.personalDataDir,'moonshine','venv','bin','python'),
      modelDir:path.join(base.personalDataDir,'moonshine','model'),
    });
  });
  it('keeps developer overrides only in the unpackaged Linux application',()=>{
    const result=resolveMoonshinePaths({...base,isPackaged:false,
      developerPython:'/home/dev/.venv/bin/python',developerModelDir:'/tmp/test-model'});
    expect(result?.modelDir).toBe('/tmp/test-model');
    expect(result?.pythonPath).toBe('/home/dev/.venv/bin/python');
    expect(result?.scriptPath).toBe(path.join(base.bundleDir,'..','scripts','moonshine-stream-pilot.py'));
  });
  it('never enables an unverified native runtime on Windows or macOS',()=>{
    expect(resolveMoonshinePaths({...base,platform:'win32',isPackaged:true})).toBeNull();
    expect(resolveMoonshinePaths({...base,platform:'darwin',isPackaged:true})).toBeNull();
  });
});
