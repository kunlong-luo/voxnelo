import { existsSync, lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';

export interface AsrAssetOptions {
  isPackaged: boolean;
  resourcesPath: string;
  developerModelDir?: string | undefined;
  developerAddonPath?: string | undefined;
  /** Electron appData/voxnelo directory; never set from renderer IPC. */
  personalDataDir?: string | undefined;
}

/**
 * A user can explicitly provision a local, non-distributable experimental
 * recognizer under appData/voxnelo/offline-asr using our own pinned installer.
 * This is NOT approval to ship the native runtime or model in public builds.
 *
 * Only recognize this precise opt-in layout, model revision, native version,
 * OS/CPU pair and fully staged SHA inventory. The personal installer verifies
 * actual bytes and never updates the public build/offline-asr directory.
 */
export function isPersonalAsrCandidate(directory: string): boolean {
  try {
    const manifestPath=path.join(directory,'manifest.json');
    const info=lstatSync(manifestPath);
    if(!info.isFile()||info.isSymbolicLink()||info.size<100||info.size>100000)return false;
    const consentPath=path.join(directory,'personal-install.json');
    const consentInfo=lstatSync(consentPath);
    if(!consentInfo.isFile()||consentInfo.isSymbolicLink()||consentInfo.size>2048)return false;
    const consent=JSON.parse(readFileSync(consentPath,'utf8')) as Record<string,unknown>;
    if(consent.optIn!==true||consent.platform!==process.platform||consent.arch!==process.arch)return false;
    const m=JSON.parse(readFileSync(manifestPath,'utf8')) as Record<string,unknown>;
    if(m.releaseReady!==false ||
      typeof m.reviewState!=='string'||!m.reviewState.startsWith('engineering-only;') ||
      m.modelRevision!=='bfbb11950302dad9955f8ede01f0e768595e4fba' ||
      m.nativePackage!=='sherpa-onnx-node'||m.nativeVersion!=='1.13.8' ||
      m.platform!==process.platform||m.arch!==process.arch)return false;
    const hashes=m.sha256;
    if(!hashes||typeof hashes!=='object'||Array.isArray(hashes))return false;
    const declared=hashes as Record<string,unknown>;
    const required=[
      'model/encoder.onnx','model/decoder.onnx','model/joiner.onnx',
      'model/tokens.txt','native/index.cjs',
    ];
    if(!required.every(name=>typeof declared[name]==='string'&&/^[a-f0-9]{64}$/i.test(declared[name] as string)))return false;
    if(!Object.keys(declared).some(name=>name.startsWith('native/node_modules/')&&name.endsWith('.node')))return false;
    return required.every(name=>{
      const file=lstatSync(path.join(directory,...name.split('/')));
      return file.isFile()&&!file.isSymbolicLink()&&file.size>0;
    });
  }catch{return false;}
}

/** Never use arbitrary renderer-provided model/addon paths. */
export function resolveAsrAssets(options: AsrAssetOptions): {modelDir:string|null;addonPath:string|null} {
  if (!options.isPackaged) {
    return {
      modelDir: options.developerModelDir ?? null,
      addonPath: options.developerAddonPath ?? null,
    };
  }
  const packagedDir=path.join(options.resourcesPath,'offline-asr');
  // A full audited public release always takes precedence.
  if(existsSync(path.join(packagedDir,'model','encoder.onnx')) &&
     existsSync(path.join(packagedDir,'native','index.cjs'))){
    return {
      modelDir:path.join(packagedDir,'model'),
      addonPath:path.join(packagedDir,'native','index.cjs'),
    };
  }
  if(options.personalDataDir){
    const personal=path.join(options.personalDataDir,'offline-asr');
    if(isPersonalAsrCandidate(personal)){
      return {
        modelDir:path.join(personal,'model'),
        addonPath:path.join(personal,'native','index.cjs'),
      };
    }
  }
  return {
    modelDir:path.join(packagedDir,'model'),
    addonPath:path.join(packagedDir,'native','index.cjs'),
  };
}
