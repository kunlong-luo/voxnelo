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
