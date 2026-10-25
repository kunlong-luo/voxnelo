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
  it('uses real Windows x64 path separators for the opt-in packaged Python runtime',()=>{
    const p=resolveMoonshinePaths({
      platform:'win32',arch:'x64',systemRelease:'10.0.26100',isPackaged:true,
      resourcesPath:'C:\\Program Files\\Voxnelo\\resources',
      bundleDir:'C:\\dev\\voxnelo\\dist-electron',
      personalDataDir:'C:\\Users\\Tester\\AppData\\Roaming\\voxnelo',
      developerPython:'C:\\untrusted\\python.exe',
    });
    expect(p).toEqual({
      scriptPath:path.win32.join('C:\\Program Files\\Voxnelo\\resources',
        'moonshine','scripts','moonshine-stream-pilot.py'),
      validationScriptPath:path.win32.join('C:\\Program Files\\Voxnelo\\resources',
        'moonshine','scripts','benchmark-moonshine-voice.py'),
      pythonPath:path.win32.join('C:\\Users\\Tester\\AppData\\Roaming\\voxnelo',
        'moonshine','venv','Scripts','python.exe'),
      modelDir:path.win32.join('C:\\Users\\Tester\\AppData\\Roaming\\voxnelo',
        'moonshine','model'),
    });
  });
  it('enables only macOS 15+ ARM64; older or Intel Macs remain unsupported',()=>{
    const supported=resolveMoonshinePaths({...base,platform:'darwin',arch:'arm64',
      systemRelease:'24.6.0',isPackaged:true});
    expect(supported?.pythonPath).toBe(path.posix.join(base.personalDataDir,
      'moonshine','venv','bin','python'));
    expect(resolveMoonshinePaths({...base,platform:'darwin',arch:'arm64',
      systemRelease:'23.6.0',isPackaged:true})).toBeNull();
    expect(resolveMoonshinePaths({...base,platform:'darwin',arch:'x64',
      systemRelease:'24.6.0',isPackaged:true})).toBeNull();
  });
  it('refuses unsupported Windows ARM64 and Linux ARM64 instead of claiming ready',()=>{
    expect(resolveMoonshinePaths({...base,platform:'win32',arch:'arm64',isPackaged:true})).toBeNull();
    expect(resolveMoonshinePaths({...base,arch:'arm64',isPackaged:true})).toBeNull();
    expect(resolveMoonshinePaths({...base,platform:'freebsd',isPackaged:true})).toBeNull();
  });
});
