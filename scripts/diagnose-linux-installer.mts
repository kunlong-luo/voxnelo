#!/usr/bin/env node
/**
 * Read-only Linux .deb preflight. No elevated privileges and no installation.
 * Provides the *real* apt dependency error if a local package cannot install.
 */
import {spawnSync} from 'node:child_process';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';

if(process.platform!=='linux')throw Error('This diagnostic only runs on Linux');
const files=(await readdir('release')).filter(name=>/^voxnelo_.+_amd64\.deb$/.test(name)).sort();
if(files.length===0)throw Error('No release/voxnelo_*_amd64.deb found. Finish pnpm pack:linux first.');
const deb=path.resolve('release',files.at(-1)!);
console.log('Inspecting:',deb);
try{
  const osRelease=await readFile('/etc/os-release','utf8');
  console.log('Linux:',osRelease.split('\n').filter(line=>/^(PRETTY_NAME|ID|VERSION_ID)=/.test(line)).join(' '));
}catch{/* Optional OS information. */}
const checks:[string,string,string[]][]=[
  ['Debian archive package identity','dpkg-deb',['--field',deb,'Package']],
  ['Debian archive version','dpkg-deb',['--field',deb,'Version']],
  ['Debian archive architecture','dpkg-deb',['--field',deb,'Architecture']],
  ['Debian archive dependencies','dpkg-deb',['--field',deb,'Depends']],
  ['Available Chinese font','fc-match',['sans:lang=zh-cn']],
  ['System character encoding','locale',['charmap']],
  ['Apt installation simulation (no changes)','apt-get',['-s','install',deb]],
];
let failed=false;
for(const [label,command,args]of checks){
  const result=spawnSync(command,args,{encoding:'utf8',timeout:30000});
  console.log('\n--- '+label+' ---');
  if(result.stdout?.trim())console.log(result.stdout.trim().slice(0,12000));
  if(result.stderr?.trim())console.error(result.stderr.trim().slice(0,10000));
  if(result.error||result.status!==0){
    console.error('FAILED:',result.error?.message??command+' exit status '+result.status);
    failed=true;
  }
}
if(failed){
  console.error('\nPreflight failed. Paste the FAILED section and the apt output to the issue. This command has NOT installed or changed anything.');
  process.exitCode=1;
}else{
  console.log('\nPreflight passed: apt can resolve installation in simulation. This does NOT prove GUI/real-device installation; use sudo apt install ./release/'+path.basename(deb)+' for the actual attempt.');
}
