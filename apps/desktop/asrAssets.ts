import { createHash } from 'node:crypto';
import { createReadStream, existsSync, lstatSync, readFileSync } from 'node:fs';
import { lstat, readdir } from 'node:fs/promises';
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
  if (!options.isPackaged && (options.developerModelDir || options.developerAddonPath)) {
    // Explicit engineering paths override a user-installed pilot, but never
    // silently substitute one half of a native/model pair.
    return {
      modelDir: options.developerModelDir ?? null,
      addonPath: options.developerAddonPath ?? null,
    };
  }
  // Unpackaged development may use the same user-opted-in model as a
  // packaged Linux application; it still MUST pass full inventory validation.
  const packagedDir=path.join(options.resourcesPath,'offline-asr');
  // A full audited public release always takes precedence.
  if(options.isPackaged &&
     existsSync(path.join(packagedDir,'model','encoder.onnx')) &&
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
  if(!options.isPackaged)return {modelDir:null,addonPath:null};
  return {
    modelDir:path.join(packagedDir,'model'),
    addonPath:path.join(packagedDir,'native','index.cjs'),
  };
}

/**
 * The installer's manifest is self-declared, NOT a publisher signature.
 * Stream-verify every staged file (including native dependencies) against the
 * installer inventory, and independently pin the known large ONNX model files.
 * This detects accidental/casual modifications before Electron loads an addon,
 * but does not authenticate an npm publisher or defend against a user-level
 * attacker who can rewrite both the manifest and native module.
 */
const PINNED_MODEL_HASHES: Record<string,string> = {
  'model/encoder.onnx': '4b7edfb7783e94a66fead1470a066ccc2eceb14e2630d8aa1914e25f8ff35027',
  'model/decoder.onnx': 'af7488bbff623e8ccd4913241674557d08a72e97020c8cd4a430d7e535c472b4',
  'model/joiner.onnx': '480747e5f00fdbd68e0c93b09edfcd6698853526ccfe0f859ad624108ce7dda2',
};
const PERSONAL_ASR_MAX_FILES=310;
const PERSONAL_ASR_MAX_TOTAL_BYTES=1600*1024*1024;
const PERSONAL_ASR_PATH=/^[a-zA-Z0-9_.@+/-]+$/;
const PERSONAL_ENTRY="module.exports = require('./node_modules/sherpa-onnx-node');\n";

function safeAsrPath(relative:string):boolean {
  return PERSONAL_ASR_PATH.test(relative) &&
    !relative.split('/').some(segment=>segment===''||segment==='.'||segment==='..');
}

/**
 * Verify the complete file inventory against staged SHA-256 checksums.
 * A self-declared manifest alone cannot prove authenticity.
 */
export async function verifyPersonalAsrInventory(directory:string):Promise<boolean> {
  if(!path.isAbsolute(directory)||!isPersonalAsrCandidate(directory))return false;
  try {
    const inventory=JSON.parse(readFileSync(path.join(directory,'manifest.json'),'utf8')) as {
      sha256:Record<string,string>;
    };
    const hashes=inventory.sha256;
    const names=Object.keys(hashes);
    if(names.length<6||names.length>PERSONAL_ASR_MAX_FILES ||
      names.some(name=>!safeAsrPath(name) || !name.startsWith('model/') && !name.startsWith('native/')))return false;
    const root=await lstat(directory);
    if(!root.isDirectory()||root.isSymbolicLink())return false;
    const discovered:string[]=[];
    let total=0;
    const walk=async(relative:string):Promise<void>=>{
      const folder=relative?path.join(directory,...relative.split('/')):directory;
      for(const entry of await readdir(folder,{withFileTypes:true})){
        const next=relative?relative+'/'+entry.name:entry.name;
        if(!safeAsrPath(next))throw Error('Unsafe ASR path');
        const filename=path.join(directory,...next.split('/'));
        const stat=await lstat(filename);
        if(stat.isSymbolicLink())throw Error('Unexpected ASR symlink');
        if(stat.isDirectory()){
          if(next!=='model'&&next!=='native'&&next!=='native/node_modules'&&!next.startsWith('native/node_modules/'))
            throw Error('Unexpected ASR directory');
          await walk(next);
        }else if(stat.isFile()){
          if(next==='manifest.json'||next==='personal-install.json')continue;
          total+=stat.size;
          if(stat.size===0||total>PERSONAL_ASR_MAX_TOTAL_BYTES||
            discovered.length>=PERSONAL_ASR_MAX_FILES)throw Error('Unexpected ASR size');
          discovered.push(next);
        }else throw Error('Unexpected ASR file kind');
      }
    };
    await walk('');
    if(discovered.length!==names.length ||
      discovered.some(name=>!Object.hasOwn(hashes,name)))return false;
    // The only entrypoint the installer can create is this predictable loader.
    const entryPath=path.join(directory,'native','index.cjs');
    if((await lstat(entryPath)).size>256||readFileSync(entryPath,'utf8')!==PERSONAL_ENTRY)return false;
    for(const relative of discovered){
      const hash=createHash('sha256');
      const filename=path.join(directory,...relative.split('/'));
      for await(const bytes of createReadStream(filename))hash.update(bytes as Buffer);
      if(hash.digest('hex')!==hashes[relative]?.toLowerCase())return false;
    }
    return true;
  }catch{return false;}
}

/** Inspect only the known personal pilot directory; never arbitrary IPC paths. */
export async function verifyPersonalAsrCandidate(directory:string):Promise<boolean> {
  if(!isPersonalAsrCandidate(directory))return false;
  try {
    const {sha256}=JSON.parse(readFileSync(path.join(directory,'manifest.json'),'utf8')) as {
      sha256:Record<string,string>;
    };
    // Unlike the native npm dependency manifest, these hashes are committed to
    // the application itself and cannot be changed by editing a user file.
    if(Object.entries(PINNED_MODEL_HASHES).some(([name,expected])=>
      sha256[name]?.toLowerCase()!==expected))return false;
    return await verifyPersonalAsrInventory(directory);
  }catch{return false;}
}

/** Main-process startup must use this verified resolver, not the metadata-only one. */
export async function resolveVerifiedAsrAssets(options:AsrAssetOptions):
 Promise<{modelDir:string|null;addonPath:string|null}> {
  const selected=resolveAsrAssets(options);
  const personal=options.personalDataDir&&path.join(options.personalDataDir,'offline-asr');
  if(!personal||selected.addonPath!==path.join(personal,'native','index.cjs'))return selected;
  return await verifyPersonalAsrCandidate(personal)
    ? selected
    : resolveAsrAssets({...options,personalDataDir:undefined});
}
