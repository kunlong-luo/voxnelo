import { lstatSync } from 'node:fs';
import path from 'node:path';

/** Experimental Moonshine medium-streaming model inventory.
 * This check is structural only, NOT authenticity or redistribution approval.
 * Never use it alone to load executable model/runtime files in a release.
 */
export const MOONSHINE_MODEL_FILES=[
  'encoder.ort','adapter.ort','cross_kv.ort','decoder_kv.ort',
  'streaming_config.json','tokenizer.bin',
] as const;
const FRONTENDS=['frontend.ort','frontend.model.ort'] as const;

function regularFile(root:string,name:string):boolean{
  try{
    const stat=lstatSync(path.join(root,name));
    return stat.isFile()&&!stat.isSymbolicLink()&&stat.size>0;
  }catch{return false;}
}

/** Fail closed for missing, relative, or symlinked model roots. */
export function inspectMoonshineMediumModel(modelDir:unknown):{
  structurallyComplete:boolean;reason:'ready-for-integrity-review'|'missing-model';
}{
  if(typeof modelDir!=='string'||!path.isAbsolute(modelDir))
    return {structurallyComplete:false,reason:'missing-model'};
  try{
    const root=lstatSync(modelDir);
    if(!root.isDirectory()||root.isSymbolicLink())
      return {structurallyComplete:false,reason:'missing-model'};
  }catch{return {structurallyComplete:false,reason:'missing-model'};}
  const complete=MOONSHINE_MODEL_FILES.every(name=>regularFile(modelDir,name))&&
    FRONTENDS.some(name=>regularFile(modelDir,name));
  return {structurallyComplete:complete,
    reason:complete?'ready-for-integrity-review':'missing-model'};
}
