import {lstat,mkdir,mkdtemp,readdir,rename,rm} from 'node:fs/promises';
import path from 'node:path';

type ProvisionMode='install'|'repair';
const allowedExistingEntries=new Set(['venv','model','download-cache']);

async function statOrNull(filename:string){
  try{return await lstat(filename);}
  catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;}
}

/**
 * Build and verify a replacement in a separate private directory before
 * touching any existing install. The caller supplies all network and model
 * verification work, and the verifier is repeated after promotion.
 *
 * Never follow existing installation symlinks or remove unfamiliar user data.
 * An interrupted promotion leaves an identifiable backup for manual recovery;
 * the next repair refuses to overwrite that backup.
 */
export async function provisionMoonshineDirectory(
  root:string,
  mode:ProvisionMode,
  prepare:(staging:string)=>Promise<void>,
  verifyInstalled:(directory:string)=>Promise<boolean>,
):Promise<void>{
  if(!path.isAbsolute(root)||path.basename(root)!=='moonshine')
    throw Error('Invalid Moonshine installation location');
  const parent=path.dirname(root);
  await mkdir(parent,{recursive:true});
  const lock=path.join(parent,'.moonshine-install.lock');
  const backup=path.join(parent,'.moonshine-repair-backup');
  await mkdir(lock,{mode:0o700}); // atomically exclude other install processes
  let staging:string|undefined;
  let promoted=false;
  let backedUp=false;
  try{
    const previous=await statOrNull(root);
    if(previous){
      if(mode!=='repair')throw Error('Existing Moonshine install; explicit repair required');
      if(!previous.isDirectory()||previous.isSymbolicLink())
        throw Error('Refusing to repair a symlink or non-directory install');
      if(await statOrNull(backup))
        throw Error('A Moonshine recovery backup already exists; refusing overwrite');
      for(const entry of await readdir(root,{withFileTypes:true})){
        if(!allowedExistingEntries.has(entry.name)||!entry.isDirectory()||entry.isSymbolicLink())
          throw Error('Unexpected personal data in Moonshine directory; refusing repair');
      }
    }
    staging=await mkdtemp(path.join(parent,'.moonshine-stage-'));
    // prepare must verify native SDK version and the *entire* pinned model set
    // before any existing user files are touched.
    await prepare(staging);
    if(!await verifyInstalled(staging))throw Error('Staged Moonshine verification failed');
    if(previous){
      await rename(root,backup);
      backedUp=true;
    }else if(await statOrNull(root)){
      throw Error('A concurrent process created the target directory');
    }
    await rename(staging,root);
    staging=undefined;
    promoted=true;
    // Check again under the fixed path Electron will actually execute.
    if(!await verifyInstalled(root))throw Error('Promoted Moonshine verification failed');
    if(backedUp){
      await rm(backup,{recursive:true});
      backedUp=false;
    }
  }catch(error){
    if(promoted){
      await rm(root,{recursive:true,force:true});
    }
    if(backedUp){
      await rename(backup,root);
    }
    throw error;
  }finally{
    if(staging)await rm(staging,{recursive:true,force:true});
    await rm(lock,{recursive:true,force:true});
  }
}
