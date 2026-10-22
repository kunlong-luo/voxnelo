import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {lstat,readdir} from 'node:fs/promises';
import path from 'node:path';

/** SHA-256 for Moonshine Voice 0.0.65 English Medium Streaming quantized model.
 * Captured from actual model files in Linux real-inference CI; not a signed
 * publisher attestation. Revalidate provenance before public redistribution.
 */
export const PINNED_MOONSHINE_MEDIUM_FILES:Readonly<Record<string,string>>=Object.freeze({
  'adapter.ort':'16307442b7f4229f2f1511fc51b545cec9616e55872c588f3a297bbc6f4762ea',
  'cross_kv.ort':'354b9a955caeb768b528f447f0a36ce4b850ca7b4531900165df304d97904fba',
  'decoder_kv.ort':'fa67aa87521247f5bf44d3e44d4e4978e58c1f114249c3c6909c882624056715',
  'decoder_kv_with_attention.ort':'40919de95d08690da3a8ff6df14cf55b3220046f3b767b4a4b769e7b32aaf2d2',
  'encoder.ort':'a5f11167a62eef61787fe8410453257d6ddb8eba90af461a9604e5f2e93d5322',
  'frontend.ort':'378fe8a5d7090a1b9ab88bbb1fc95bde010cdd64ec23419350d2d23c675636e9',
  'streaming_config.json':'28e83b7a28e91472692a035e0dae3116422ae43aeb2bef5ed822c44ce89b88af',
  'tokenizer.bin':'6884b35fd6377d4c4d32336a0bc152f36b64d1e45b6503683cdc238250a8472d',
});

/** Do not accept a self-declared checksum list from an installed pack. */
export async function verifyPinnedMoonshineMediumModel(
  directory:string,
  expected:Readonly<Record<string,string>>=PINNED_MOONSHINE_MEDIUM_FILES,
):Promise<boolean>{
  try{
    if(!path.isAbsolute(directory))return false;
    const root=await lstat(directory);
    if(!root.isDirectory()||root.isSymbolicLink())return false;
    const entries=await readdir(directory,{withFileTypes:true});
    const required=Object.keys(expected).sort();
    const present=entries.filter(e=>!e.name.endsWith('.lock')).map(e=>e.name).sort();
    if(required.length===0||required.length>32||JSON.stringify(required)!==JSON.stringify(present))return false;
    for(const name of required){
      if(!/^[A-Za-z0-9_.-]+$/.test(name)||name==='.'||name==='..')return false;
      const full=path.join(directory,name);
      const stats=await lstat(full);
      if(!stats.isFile()||stats.isSymbolicLink()||stats.size<1||stats.size>1_000_000_000)return false;
      const hash=createHash('sha256');
      for await(const bytes of createReadStream(full))hash.update(bytes as Buffer);
      if(hash.digest('hex')!==expected[name])return false;
    }
    // Locks may be left by the official downloader, but no symlinks or
    // arbitrary subdirectories are allowed even among ignored lock entries.
    return entries.every(entry=>
      (Object.hasOwn(expected,entry.name)&&entry.isFile())||
      (entry.name.endsWith('.lock')&&entry.isFile()&&!entry.isSymbolicLink()&&
        Object.hasOwn(expected,entry.name.slice(0,-5))));
  }catch{return false;}
}
