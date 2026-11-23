import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {lstat,readdir} from 'node:fs/promises';
import path from 'node:path';
import snapshot from '../../docs/engineering/moonshine-python312-wheel-digests-2026-11-23.json' with {type:'json'};
import {supportedMoonshineHost} from './moonshinePlatform.ts';
import {MOONSHINE_RUNTIME_DEPENDENCIES} from './moonshinePythonDependencies.ts';
import {pinnedMoonshineWheel} from './moonshineWheelIntegrity.ts';

/** Verified exact PyPI file-byte digests from CI #45116534459. The JSON is
 * bundled into the Electron installer; it is NEVER loaded from a writable user
 * directory. Registry SHA agreement is not a publisher signature or license
 * approval. Only the tested Python 3.12 ABI and supported OS/CPU are allowed.
 */
export interface LockedMoonshineWheel {
  name:string;
  version:string;
  filename:string;
  sha256:string;
}
const normalize=(name:string)=>name.toLowerCase().replace(/[-_.]+/g,'-');

export function pinnedMoonshineWheelhouse(
  platform:string,arch:string,systemRelease:string,pythonVersion:string,
):readonly LockedMoonshineWheel[]|null{
  if(!supportedMoonshineHost(platform,arch,systemRelease)||
    !/^3\.12\.\d+$/.test(pythonVersion)||
    snapshot.schemaVersion!==1||snapshot.candidatePython!=='3.12'||
    snapshot.buildProvenanceAttested!==false||snapshot.licenseApproved!==false||
    snapshot.userInstallerHashLocked!==false)return null;
  if(platform!=='linux'&&platform!=='win32'&&platform!=='darwin')return null;
  const entries:Readonly<Record<string,string>>=snapshot.platforms[platform];
  const expected=new Map(Object.entries(MOONSHINE_RUNTIME_DEPENDENCIES)
    .filter(([name])=>name!=='colorama'||platform==='win32'));
  if(Object.keys(entries).length!==expected.size)return null;
  const sdk=pinnedMoonshineWheel(platform,arch,systemRelease);
  if(!sdk||entries[sdk.filename]!==sdk.sha256)return null;
  const seen=new Set<string>();
  const wheels:LockedMoonshineWheel[]=[];
  for(const [filename,sha256] of Object.entries(entries)){
    const parts=filename.endsWith('.whl')?filename.slice(0,-4).split('-'):[];
    if((parts.length!==5&&parts.length!==6)||
      !/^[A-Za-z0-9_]+$/.test(parts[0]??'')||
      !/^[A-Za-z0-9.+_]+$/.test(parts[1]??'')||
      !/^[A-Za-z0-9_.-]+\.whl$/.test(filename)||
      !/^[a-f0-9]{64}$/.test(sha256))return null;
    const name=normalize(parts[0]!),version=parts[1]!;
    if(seen.has(name)||expected.get(name)!==version)return null;
    seen.add(name);
    wheels.push({name,version,filename,sha256});
  }
  if([...expected.keys()].some(name=>!seen.has(name)))return null;
  return wheels.sort((a,b)=>a.name.localeCompare(b.name));
}

/** PEP 610/requirements-style exact hashes are consumed by both pip download
 * and the fully offline local pip install; there are no unpinned dependencies.
 * Python-only venv bootstrap tools (pip itself) are out of the app dependency
 * snapshot and are not granted an app dependency waiver.
 */
export function moonshineHashedRequirements(wheels:readonly LockedMoonshineWheel[]):string{
  return wheels.map(({name,version,sha256})=>
    name+'=='+version+' --hash=sha256:'+sha256).join('\n')+'\n';
}

/** Rehash all staged native payloads BEFORE pip may load any of them.
 * Fail closed on missing/extra/symlinked files, altered bytes or read errors.
 * The staging directory itself is private and created transactionally.
 */
export async function verifyPinnedMoonshineWheelhouse(
  directory:string,wheels:readonly LockedMoonshineWheel[],
):Promise<boolean>{
  if(!path.isAbsolute(directory)||wheels.length<1)return false;
  try{
    const root=await lstat(directory);
    if(!root.isDirectory()||root.isSymbolicLink())return false;
    const entries=await readdir(directory,{withFileTypes:true});
    if(entries.length!==wheels.length)return false;
    const expected=new Map(wheels.map(wheel=>[wheel.filename,wheel.sha256]));
    if(expected.size!==wheels.length)return false;
    for(const entry of entries){
      const digest=expected.get(entry.name);
      if(!digest||!/^[a-f0-9]{64}$/.test(digest)||
        !entry.isFile()||entry.isSymbolicLink())return false;
      const hash=createHash('sha256');
      for await(const block of createReadStream(path.join(directory,entry.name)))
        hash.update(block);
      if(hash.digest('hex')!==digest)return false;
    }
    return true;
  }catch{return false;}
}
