import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {lstat} from 'node:fs/promises';
import path from 'node:path';

/** Fixed Electron resource and per-user install locations.
 * Never accept model/runtime paths from renderer IPC.
 */
export interface MoonshinePaths {
  scriptPath:string;
  validationScriptPath:string;
  modelDir:string;
  pythonPath:string;
}
export function resolveMoonshinePaths(options:{
  isPackaged:boolean;platform:string;resourcesPath:string;bundleDir:string;
  personalDataDir:string;developerPython?:string|undefined;developerModelDir?:string|undefined;
}):MoonshinePaths|null{
  if(options.platform!=='linux')return null;
  const scriptFolder=options.isPackaged
    ?path.join(options.resourcesPath,'moonshine','scripts')
    :path.join(options.bundleDir,'..','scripts');
  const modelDir=options.isPackaged
    ?path.join(options.personalDataDir,'moonshine','model')
    :options.developerModelDir??path.join(options.personalDataDir,'moonshine','model');
  const pythonPath=options.isPackaged
    ?path.join(options.personalDataDir,'moonshine','venv','bin','python')
    :options.developerPython??path.join(options.personalDataDir,'moonshine','venv','bin','python');
  return {scriptPath:path.join(scriptFolder,'moonshine-stream-pilot.py'),
    validationScriptPath:path.join(scriptFolder,'benchmark-moonshine-voice.py'),
    modelDir,pythonPath};
}

const execFileAsync=promisify(execFile);
/** Check the exact native SDK release without importing the native inference
 * library or triggering model downloads. This is a version gate, not a
 * publisher signature or a full Python wheel hash audit.
 */
export async function verifyMoonshinePythonRuntime(pythonPath:string):Promise<boolean>{
  try{
    if(!path.isAbsolute(pythonPath))return false;
    // Python venv interpreter is commonly a symlink to the system interpreter.
    // Require a normal file or a resolvable symlink, not directories/sockets.
    const entry=await lstat(pythonPath);
    if(!entry.isFile()&&!entry.isSymbolicLink())return false;
    const code='import importlib.metadata,sys;print(importlib.metadata.version("moonshine-voice") if sys.version_info >= (3,10) else "unsupported")';
    const {stdout}=await execFileAsync(pythonPath,['-I','-c',code],{
      encoding:'utf8',timeout:5000,maxBuffer:1024,
      env:{PATH:process.env.PATH??'/usr/bin:/bin',PYTHONNOUSERSITE:'1'},
    });
    return stdout.trim()==='0.0.65';
  }catch{return false;}
}
