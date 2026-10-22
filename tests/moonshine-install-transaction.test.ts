import {afterEach,describe,expect,it} from 'vitest';
import {mkdtempSync,readFileSync,mkdirSync,readdirSync,rmSync,symlinkSync,writeFileSync} from 'node:fs';
import {mkdtemp,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {provisionMoonshineDirectory} from '../scripts/moonshine-install-transaction.mts';

const parents:string[]=[];
afterEach(()=>{for(const parent of parents.splice(0))rmSync(parent,{recursive:true,force:true});});
function fixture(){
  const parent=mkdtempSync(path.join(tmpdir(),'voxnelo-safe-repair-'));
  parents.push(parent);
  return {parent,root:path.join(parent,'moonshine')};
}
const prepare=async(stage:string)=>{
  mkdirSync(path.join(stage,'model'));
  mkdirSync(path.join(stage,'venv'));
  await writeFile(path.join(stage,'model','marker'),'verified model');
};
const verify=async(dir:string)=>{
  try{return readFileSync(path.join(dir,'model','marker'),'utf8')==='verified model';}
  catch{return false;}
};
describe('transactional personal Moonshine installer',()=>{
  it('promotes a verified fresh installation and removes temporary directories',async()=>{
    const {parent,root}=fixture();
    await provisionMoonshineDirectory(root,'install',prepare,verify);
    expect(await verify(root)).toBe(true);
    expect(readdirSync(parent)).toEqual(['moonshine']);
  });
  it('requires explicit repair and keeps the existing model unchanged',async()=>{
    const {parent,root}=fixture();
    mkdirSync(root);
    mkdirSync(path.join(root,'model'));
    mkdirSync(path.join(root,'venv'));
    writeFileSync(path.join(root,'model','marker'),'old model');
    await expect(provisionMoonshineDirectory(root,'install',prepare,verify))
      .rejects.toThrow('explicit repair');
    expect(readFileSync(path.join(root,'model','marker'),'utf8')).toBe('old model');
    expect(readdirSync(parent)).toEqual(['moonshine']);
  });
  it('replaces a corrupted model only after staging has passed verification',async()=>{
    const {parent,root}=fixture();
    mkdirSync(root);
    mkdirSync(path.join(root,'model'));
    mkdirSync(path.join(root,'venv'));
    writeFileSync(path.join(root,'model','marker'),'corrupted');
    await provisionMoonshineDirectory(root,'repair',prepare,verify);
    expect(await verify(root)).toBe(true);
    expect(readdirSync(parent)).toEqual(['moonshine']);
  });
  it('preserves previous installation when preparation fails',async()=>{
    const {parent,root}=fixture();
    mkdirSync(root);mkdirSync(path.join(root,'model'));mkdirSync(path.join(root,'venv'));
    writeFileSync(path.join(root,'model','marker'),'keep existing data');
    await expect(provisionMoonshineDirectory(root,'repair',async(stage)=>{
      await prepare(stage);
      throw Error('download interrupted');
    },verify)).rejects.toThrow('download interrupted');
    expect(readFileSync(path.join(root,'model','marker'),'utf8')).toBe('keep existing data');
    expect(readdirSync(parent)).toEqual(['moonshine']);
  });
  it('rolls back after the new installation fails verification at its final path',async()=>{
    const {parent,root}=fixture();
    mkdirSync(root);mkdirSync(path.join(root,'model'));mkdirSync(path.join(root,'venv'));
    writeFileSync(path.join(root,'model','marker'),'old');
    await expect(provisionMoonshineDirectory(root,'repair',prepare,async(dir)=>
      path.basename(dir)!=='moonshine'&&await verify(dir))).rejects.toThrow('Promoted');
    expect(readFileSync(path.join(root,'model','marker'),'utf8')).toBe('old');
    expect(readdirSync(parent)).toEqual(['moonshine']);
  });
  it('refuses to remove unknown personal files or symlinked installations',async()=>{
    const {parent,root}=fixture();
    mkdirSync(root);mkdirSync(path.join(root,'model'));mkdirSync(path.join(root,'venv'));
    writeFileSync(path.join(root,'personal-notes.txt'),'never remove');
    await expect(provisionMoonshineDirectory(root,'repair',prepare,verify))
      .rejects.toThrow('Unexpected personal data');
    expect(readFileSync(path.join(root,'personal-notes.txt'),'utf8')).toBe('never remove');
    const alias=path.join(parent,'real');
    mkdirSync(alias);rmSync(root,{recursive:true});symlinkSync(alias,root,'dir');
    await expect(provisionMoonshineDirectory(root,'repair',prepare,verify))
      .rejects.toThrow('symlink');
    expect(readdirSync(alias)).toEqual([]);
  });
  it('refuses to overwrite a recovery backup or concurrent installation lock',async()=>{
    const {parent,root}=fixture();
    mkdirSync(root);mkdirSync(path.join(root,'model'));mkdirSync(path.join(root,'venv'));
    const backup=path.join(parent,'.moonshine-repair-backup');
    mkdirSync(backup);
    await expect(provisionMoonshineDirectory(root,'repair',prepare,verify))
      .rejects.toThrow('backup already exists');
    rmSync(backup,{recursive:true});
    const lock=path.join(parent,'.moonshine-install.lock');mkdirSync(lock);
    await expect(provisionMoonshineDirectory(root,'repair',prepare,verify)).rejects.toThrow();
    expect(readdirSync(parent).sort()).toEqual(['.moonshine-install.lock','moonshine']);
  });
});
