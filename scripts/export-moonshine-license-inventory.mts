#!/usr/bin/env node
/** Read-only CI evidence collector. Does not download anything or approve a license. */
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import path from 'node:path';

const destination=process.argv[2];
if(!destination||!path.isAbsolute(destination))
  throw Error('Provide an absolute path for the private metadata evidence file');
const personal=process.platform==='win32'
  ?process.env.APPDATA??path.join(homedir(),'AppData','Roaming')
  :process.platform==='darwin'
    ?path.join(homedir(),'Library','Application Support')
    :process.env.XDG_CONFIG_HOME??path.join(homedir(),'.config');
const root=path.join(personal,'voxnelo','moonshine','venv');
const python=process.platform==='win32'
  ?path.join(root,'Scripts','python.exe'):path.join(root,'bin','python');
const result=spawnSync(python,[
  '-I',path.resolve('scripts/collect-moonshine-license-metadata.py'),
],{
  encoding:'utf8',timeout:15000,maxBuffer:8*1024*1024,
  env:{PATH:process.env.PATH??'',PYTHONNOUSERSITE:'1'},
});
if(result.status!==0||result.error)
  throw Error('Moonshine installed dependency metadata inventory failed');
const data=JSON.parse(result.stdout) as {
  schemaVersion?:number;licenseApproved?:boolean;
  copyrightAndRedistributionReviewed?:boolean;
  packages?:Array<{name?:string;version?:string}>;
};
if(data.schemaVersion!==1||data.licenseApproved!==false||
  data.copyrightAndRedistributionReviewed!==false||
  !Array.isArray(data.packages)||data.packages.length<1||
  !data.packages.some(pkg=>pkg.name?.toLowerCase().replace(/_/g,'-')==='moonshine-voice'&&
    pkg.version==='0.0.65'))
  throw Error('Invalid Moonshine license evidence inventory');
const serialized=JSON.stringify(data,null,2)+'\n';
if(serialized.includes(homedir()))
  throw Error('Refusing to export private home-directory data');
mkdirSync(path.dirname(destination),{recursive:true});
writeFileSync(destination,serialized,{flag:'wx',mode:0o600});
console.log('Wrote non-identifying Moonshine Python license metadata inventory; manual approval still required.');
