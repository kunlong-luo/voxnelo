import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const roots:string[]=[];
const script=path.resolve('scripts/check-asr-staging.mts');
function staging() {
  const dir=mkdtempSync(path.join(tmpdir(),'voxnelo-asr-release-'));
  roots.push(dir);
  writeFileSync(path.join(dir,'README.md'),'Optional release assets');
  return dir;
}
function run(dir:string) {
  return spawnSync(process.execPath,['--experimental-strip-types',script,dir],{
    encoding:'utf8',timeout:15000,
  });
}
function add(dir:string,name:string,content:string) {
  const filename=path.join(dir,...name.split('/'));
  mkdirSync(path.dirname(filename),{recursive:true});
  writeFileSync(filename,content);
  return createHash('sha256').update(content).digest('hex');
}
afterEach(()=>roots.splice(0).forEach(root=>rmSync(root,{recursive:true,force:true})));

describe('Release staging integrity for opt-in native offline ASR',()=>{
  it('allows README-only defaults but does not claim a functional speech engine',()=>{
    const result=run(staging());
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('offline recognition disabled');
  });

  it('rejects partially copied native binaries without an integrity manifest',()=>{
    const root=staging();
    add(root,'native/index.cjs','module.exports={}');
    const result=run(root);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Partial ASR assets staged without manifest.json');
  });

  it('validates exact staged files, pinning model version and SHA-256 digests',()=>{
    const root=staging();
    const content:Record<string,string>={
      'native/index.cjs':'module.exports = { OnlineRecognizer: class {} }',
      'native/sherpa-onnx.node':'synthetic addon fixture; never shipped',
      'model/encoder.onnx':'encoder fixture',
      'model/decoder.onnx':'decoder fixture',
      'model/joiner.onnx':'joiner fixture',
      'model/tokens.txt':'tokens fixture',
    };
    const sha256:Record<string,string>={};
    for(const [filename,contents]of Object.entries(content))
      sha256[filename]=add(root,filename,contents);

    writeFileSync(path.join(root,'manifest.json'),JSON.stringify({
      modelId:'test-only',modelSource:'https://example.invalid/test-model',
      modelRevision:'a'.repeat(40),modelLicense:'Apache-2.0',
      nativePackage:'test-only',nativeVersion:'0.0.0',nativeLicense:'Apache-2.0',
      sha256,
    }));
    expect(run(root).status).toBe(0);

    // A single changed byte in model data must stop the release build.
    writeFileSync(path.join(root,'model','encoder.onnx'),'tampered');
    const tampered=run(root);
    expect(tampered.status).not.toBe(0);
    expect(tampered.stderr).toContain('checksum mismatch');
  });

  it('rejects missing binary payloads even with a complete-looking manifest',()=>{
    const root=staging();
    const sha256:Record<string,string>={};
    for(const filename of ['native/index.cjs','model/encoder.onnx','model/decoder.onnx','model/joiner.onnx','model/tokens.txt'])
      sha256[filename]=add(root,filename,'fixture');
    writeFileSync(path.join(root,'manifest.json'),JSON.stringify({
      modelId:'test',modelSource:'https://example.invalid/model',
      modelRevision:'a'.repeat(40),modelLicense:'Apache-2.0',
      nativePackage:'test',nativeVersion:'0.0.0',nativeLicense:'Apache-2.0',
      sha256,
    }));
    const result=run(root);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Missing platform-native');
  });
});
