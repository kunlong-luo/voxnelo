#!/usr/bin/env node
/**
 * Electron-builder v26 does not install AppStream metainfo in the Debian
 * filesystem. Add it as package-owned /usr/share data so KDE Discover can
 * associate Voxnelo with Leo Luo and the real branded icon.
 *
 * This script is Linux only; it runs after electron-builder and before package
 * checks/checksums. It never touches the user's installed app or home folder.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { copyFile, mkdtemp, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DISCOVER_LOCAL_DEB_NAME, selectLinuxInstallers } from './release-installer-selection.mts';

const META_NAME='app.voxnelo.desktop.metainfo.xml';
const DESCRIPTION_PATH=path.join('usr','share','metainfo',META_NAME);

function dpkg(args:string[]):void{
  const result=spawnSync('dpkg-deb',args,{encoding:'utf8',timeout:180000});
  assert.equal(result.status,0,`dpkg-deb ${args[0]} failed: ${result.error?.message??result.stderr}`);
}

function brandedIconSubpath(icon:Buffer):string{
  assert.equal(icon.subarray(0,8).toString('hex'),'89504e470d0a1a0a','Missing Voxnelo PNG signature');
  const width=icon.readUInt32BE(16);
  const height=icon.readUInt32BE(20);
  assert.ok(width===height&&width>=64&&width<=2048,'Voxnelo logo must be a square, usable Linux icon');
  return path.join('usr','share','icons','hicolor',`${width}x${height}`,'apps','voxnelo.png');
}

export async function brandLinuxInstaller():Promise<{deb:string;iconPath:string;discoverDeb:string}>{
  assert.equal(process.platform,'linux','Debian AppStream packaging is Linux-only');
  const metadata=JSON.parse(await readFile('package.json','utf8')) as {version:string;author?:string};
  assert.equal(metadata.author,'Leo Luo','Unexpected app developer');
  const release=path.resolve('release');
  const {deb}=selectLinuxInstallers(await readdir(release),metadata.version,process.arch);
  const pathname=path.join(release,deb);
  const xml=await readFile(path.resolve('build',META_NAME));
  const xmlText=xml.toString('utf8');
  assert.ok(xmlText.includes(`<release version="${metadata.version}"`),
    'AppStream release metadata must match package version');
  assert.ok(xmlText.includes('<name>Leo Luo</name>')&&xmlText.includes('<id>app.voxnelo.desktop</id>'),
    'Missing brand developer or application identifier in AppStream');
  const iconBytes=await readFile('build/icon.png');
  const iconPath=brandedIconSubpath(iconBytes);
  const temp=await mkdtemp(path.join(release,'.appstream-'));
  const stage=path.join(temp,'root');
  const rebuilt=path.join(temp,'rebuilt.deb');
  try{
    dpkg(['--raw-extract',pathname,stage]);
    const metadataFile=path.join(stage,DESCRIPTION_PATH);
    const iconFile=path.join(stage,iconPath);
    await mkdir(path.dirname(metadataFile),{recursive:true});
    await mkdir(path.dirname(iconFile),{recursive:true});
    await writeFile(metadataFile,xml,{mode:0o644});
    await copyFile(path.resolve('build','icon.png'),iconFile);
    const iconStat=await stat(iconFile);
    assert.ok(iconStat.isFile()&&iconStat.size>256,'Packaged branding icon missing');
    const md5sums=path.join(stage,'DEBIAN','md5sums');
    const entries=[DESCRIPTION_PATH,iconPath];
    let previous=existsSync(md5sums)?await readFile(md5sums,'utf8'):'';
    const oldEntries=new Set(entries.map(item=>item.split(path.sep).join('/')));
    previous=previous.split('\n').filter(line=>
      ![...oldEntries].some(name=>line.trimEnd().endsWith('  '+name))).join('\n');
    if(previous&&!previous.endsWith('\n'))previous+='\n';
    const newLines=await Promise.all(entries.map(async item=>{
      const bytes=await readFile(path.join(stage,item));
      return createHash('md5').update(bytes).digest('hex')+'  '+item.split(path.sep).join('/');
    }));
    await writeFile(md5sums,previous+newLines.join('\n')+'\n');
    // Preserve control data but force package ownership 0:0 throughout, even
    // though the build runner unpacks as an ordinary non-root user.
    dpkg(['--build','--root-owner-group',stage,rebuilt]);
    const built=await stat(rebuilt);
    assert.ok(built.size>1024*1024,'Rebuilt branded installer is unexpectedly small');
    await rename(rebuilt,pathname);
    // Discover's *local-file* backend displays QFileInfo::baseName(), so a
    // standard versioned name displays "voxnelo_0". This friendly alias is
    // not a new package: it contains byte-for-byte the same rebuilt DEB.
    // Always refresh it after packaging; never use a stale prior build.
    await copyFile(pathname,path.join(release,DISCOVER_LOCAL_DEB_NAME));
    console.log(`AppStream branding installed into ${deb}: Leo Luo, ${DESCRIPTION_PATH}, ${iconPath}`);
    console.log(`Open release/${DISCOVER_LOCAL_DEB_NAME} for the correct local Discover title; local-file author metadata remains Discover-controlled.`);
    return {deb,iconPath,discoverDeb:DISCOVER_LOCAL_DEB_NAME};
  }finally{
    await rm(temp,{recursive:true,force:true});
  }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  await brandLinuxInstaller();
}
