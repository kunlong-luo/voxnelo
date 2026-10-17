#!/usr/bin/env node
/**
 * Inspect unpacked Linux/macOS/Windows bundles and Linux installer outputs. No binary launch:
 * hosted runners do not guarantee an interactive OS user session.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { open, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { selectLinuxInstallers } from './release-installer-selection.mts';

const appMetadata=JSON.parse(await readFile(path.resolve('package.json'),'utf8')) as {version:string};
const expectedVersion=appMetadata.version;
assert.match(expectedVersion,/^\d+\.\d+\.\d+$/,'Invalid Voxnelo release version');
const platform=process.platform;
if(platform!=='darwin'&&platform!=='win32'&&platform!=='linux')throw Error('Packaging checks require Linux, macOS or Windows');
const release=path.resolve('release');
const directories=(await readdir(release,{withFileTypes:true})).filter(entry=>entry.isDirectory()).map(entry=>entry.name);
const base=platform==='win32'
  ? directories.find(name=>name==='win-unpacked')
  : platform==='darwin'
    ? directories.find(name=>/^mac(?:-arm64|-x64)?$/.test(name))
    : directories.find(name=>/^linux(?:-arm64|-x64)?-unpacked$/.test(name));
assert.ok(base,'Unpacked '+platform+' desktop output missing from '+release+': '+directories.join(','));
const appRoot=platform==='darwin'
  ? path.join(release,base,'Voxnelo.app')
  : path.join(release,base);
const contentDir=platform==='darwin'?path.join(appRoot,'Contents'):appRoot;
const resources=path.join(contentDir,platform==='darwin'?'Resources':'resources');
const executable=platform==='win32'
  ? path.join(appRoot,'Voxnelo.exe')
  : platform==='darwin'
    ? path.join(contentDir,'MacOS','Voxnelo')
    : path.join(appRoot,existsSync(path.join(appRoot,'voxnelo'))?'voxnelo':'Voxnelo');
const bundle=path.join(resources,'app.asar');
const icon=path.join(resources,'icons','voxnelo.png');
const requiredFiles: Array<[string, string, number]> = [['native executable',executable,1024],['asar archive',bundle,1024],['branded PNG',icon,256]];
for(const [label,filename,minBytes] of requiredFiles){
  const info=await stat(filename);
  assert.ok(info.isFile()&&info.size>minBytes,label+' missing/empty: '+filename);
}
const png=await readFile(icon);
assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a','Wrong branded PNG magic');
if(platform==='darwin'){
  const plist=await readFile(path.join(contentDir,'Info.plist'),'utf8');
  assert.match(plist,/<string>app\.voxnelo\.desktop<\/string>/,'Wrong macOS bundle identifier');
  assert.match(plist,/NSMicrophoneUsageDescription/,'macOS microphone consent explanation missing');
}
const asrStagingManifest=path.resolve('build','offline-asr','manifest.json');
const copiedAsrManifest=path.join(resources,'offline-asr','manifest.json');
const asrChecks:string[]=[];
if(existsSync(asrStagingManifest)){
  assert.ok(existsSync(copiedAsrManifest),'Packaged offline ASR manifest is missing');
  const staged=JSON.parse(await readFile(asrStagingManifest,'utf8')) as {sha256:Record<string,string>;platform:string;arch:string};
  const copied=JSON.parse(await readFile(copiedAsrManifest,'utf8')) as typeof staged;
  assert.deepEqual(copied,staged,'Packaged ASR manifest does not match staged release');
  assert.equal(copied.platform,process.platform,'Wrong native ASR operating system in package');
  assert.equal(copied.arch,process.arch,'Wrong native ASR CPU architecture in package');
  for(const [relative,expected] of Object.entries(copied.sha256)){
    const file=path.join(resources,'offline-asr',...relative.split('/'));
    const hash=createHash('sha256').update(await readFile(file)).digest('hex');
    assert.equal(hash,expected,'Packaged native ASR/model hash mismatch: '+relative);
  }
  asrChecks.push('copied offline ASR manifest','all packaged ASR hashes','platform native architecture');
}else{
  assert.equal(existsSync(copiedAsrManifest),false,'Unexpected ASR model manifest in default package');
  asrChecks.push('no unreviewed default ASR payload');
}
const linuxChecks:string[]=[];
if(platform==='linux'){
  // Prior local builds remain in release/. Select only the exact version
  // requested by package.json, regardless of readdir() ordering.
  const {deb,appImage}=selectLinuxInstallers(await readdir(release),expectedVersion,process.arch);
  const readPrefix=async(filename:string,length:number)=>{
    const handle=await open(filename,'r');
    try{
      const bytes=Buffer.alloc(length);
      const read=await handle.read(bytes,0,length,0);
      assert.equal(read.bytesRead,length,'Incomplete installer header: '+filename);
      return bytes;
    }finally{await handle.close();}
  };
  const debPath=path.join(release,deb);
  const appImagePath=path.join(release,appImage);
  for(const filename of [debPath,appImagePath]){
    const info=await stat(filename);
    assert.ok(info.isFile()&&info.size>1024*1024,'Installer missing or unexpectedly small: '+filename);
  }
  assert.equal((await readPrefix(debPath,8)).toString('ascii'),'!<arch>\n','Invalid Debian archive');
  assert.equal((await readPrefix(appImagePath,4)).toString('hex'),'7f454c46','AppImage is not an ELF executable');
  const metadata=spawnSync('dpkg-deb',['--field',debPath,'Package'],{encoding:'utf8'});
  assert.equal(metadata.status,0,'dpkg-deb could not inspect installer: '+metadata.stderr);
  assert.match(metadata.stdout.trim(),/^voxnelo$/i,'Wrong Debian package identity');
  const installedVersion=spawnSync('dpkg-deb',['--field',debPath,'Version'],{encoding:'utf8'});
  assert.equal(installedVersion.status,0,'dpkg-deb could not inspect Debian version: '+installedVersion.stderr);
  assert.equal(installedVersion.stdout.trim(),expectedVersion,'DEB package Version must match Voxnelo release version');
  // Electron-builder/FPM may silently replace Chinese package metadata with
  // question marks under a non-UTF-8 environment. Test the actual .deb metadata
  // shown by Linux package managers (not merely package.json).
  const description=spawnSync('dpkg-deb',['--field',debPath,'Description'],{encoding:'utf8'});
  assert.equal(description.status,0,'dpkg-deb could not inspect installer description: '+description.stderr);
  assert.match(description.stdout,/Voxnelo - English speaking practice/,'Debian package synopsis missing or corrupted');
  assert.match(description.stdout,/Free, local-first English speaking practice/,'Debian package description missing or corrupted');
  assert.doesNotMatch(description.stdout,/\?{2,}|\uFFFD/,'Debian package description contains replacement characters');
  const dependencies=spawnSync('dpkg-deb',['--field',debPath,'Depends'],{encoding:'utf8'});
  assert.equal(dependencies.status,0,'dpkg-deb could not inspect dependencies: '+dependencies.stderr);
  assert.match(dependencies.stdout,/(?:^|[,\s])fonts-noto-cjk(?:[,\s(]|$)/,'Debian installer must provide Chinese CJK font support');
  // electron-builder 26.15.3 does not expand the newer `default` keyword here.
  // Keep this assertion: a literal Depends: default makes the DEB uninstallable.
  assert.doesNotMatch(dependencies.stdout,/(?:^|[,\s])default(?:[,\s(]|$)/,'Builder did not expand default Debian dependencies');
  assert.match(dependencies.stdout,/(?:^|[,\s])libnss3(?:[,\s(]|$)/,'Electron default Linux runtime dependencies were dropped');
  linuxChecks.push('deb archive, package identity and CJK font dependency','AppImage ELF header','both installers nonempty');
}
// Full installer checks are a strict release-candidate gate. PR CI intentionally
// uses unpacked Windows/macOS bundles for faster feedback, while Linux PR CI
// already exercises both installer formats.
const candidateChecks:string[]=[];
if(process.env.VOXNELO_REQUIRE_INSTALLERS==='1'){
  if(platform==='linux'){
    candidateChecks.push('Linux deb and AppImage previously verified');
  }else{
    const files=await readdir(release);
    const suffix=platform==='win32'?'.exe':'.dmg';
    const installers=files.filter(name=>name.toLowerCase().includes('voxnelo')&&name.toLowerCase().endsWith(suffix));
    assert.ok(installers.length>0,'Release candidate installer missing: '+suffix);
    for(const installer of installers){
      const filename=path.join(release,installer);
      const info=await stat(filename);
      assert.ok(info.isFile()&&info.size>1024*1024,'Installer unexpectedly small: '+installer);
      const handle=await open(filename,'r');
      try{
        if(platform==='win32'){
          const magic=Buffer.alloc(2);
          const result=await handle.read(magic,0,2,0);
          assert.equal(result.bytesRead,2,'Incomplete Windows installer: '+installer);
          assert.equal(magic.toString('ascii'),'MZ','Windows candidate is not an executable PE/NSIS installer');
          candidateChecks.push('Windows NSIS installer MZ header');
        }else{
          // Apple UDIF disk images have a koly footer in the final 512 bytes.
          const footer=Buffer.alloc(4);
          const result=await handle.read(footer,0,4,info.size-512);
          assert.equal(result.bytesRead,4,'Incomplete macOS DMG: '+installer);
          assert.equal(footer.toString('ascii'),'koly','macOS candidate is not a valid UDIF DMG');
          candidateChecks.push('macOS DMG UDIF footer');
        }
      }finally{await handle.close();}
    }
  }
}
const report={
  platform,
  output:base,
  appRoot:path.relative(path.resolve('.'),appRoot),
  icon:path.relative(path.resolve('.'),icon),
  tested:['native executable','asar','bundled branded icon','brand PNG magic',...(platform==='darwin'?['CFBundleIdentifier','NSMicrophoneUsageDescription']:[]),...linuxChecks,...candidateChecks,...asrChecks],
  launched:false,
};
console.log('Cross-platform package integrity passed:',JSON.stringify(report));
