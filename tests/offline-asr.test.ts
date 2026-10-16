import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { OfflineAsr } from '../apps/desktop/offlineAsr';

const roots:string[]=[];
afterEach(()=>roots.splice(0).forEach(dir=>rmSync(dir,{recursive:true,force:true})));
function root() {
  const dir=mkdtempSync(path.join(tmpdir(),'voxnelo-asr-test-'));
  roots.push(dir);
  return dir;
}

describe('Offline ASR explicit activation and deny-by-default IPC',()=>{
  it('does not start native inference without developer-installed model and addon',async()=>{
    const driver=new OfflineAsr(null,null);
    expect(driver.capabilities()).toEqual({available:false,reason:'not-configured'});
    expect(await driver.open({} as never)).toEqual({ok:false,reason:'not-configured'});
    expect(()=>driver.push({} as never,'unknown',new Float32Array([0.2]))).not.toThrow();
    expect(()=>driver.stop({} as never,'unknown')).not.toThrow();
    driver.close();
  });
  it('does not trust missing/incomplete models or relative addon paths',()=>{
    const dir=root();
    const addon=path.join(dir,'fake-addon.js');
    writeFileSync(addon,'module.exports = {}');
    expect(new OfflineAsr(dir,addon).capabilities().available).toBe(false);
    for(const file of ['encoder.onnx','decoder.onnx','joiner.onnx','tokens.txt']){
      writeFileSync(path.join(dir,file),'fixture');
    }
    expect(new OfflineAsr(dir,'./fake-addon.js').capabilities().available).toBe(false);
    expect(new OfflineAsr(dir,addon).capabilities()).toEqual({available:true,reason:'ready'});
    const empty=path.join(dir,'missing');
    mkdirSync(empty);
    expect(new OfflineAsr(empty,addon).capabilities().available).toBe(false);
  });
});
