import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { EventEmitter } from 'node:events';
import type { Worker } from 'node:worker_threads';
import type { WebContents } from 'electron';
import { vi } from 'vitest';
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
  it('bounds microphone PCM backlog, validates samples, and does not silently drop overloaded audio',async()=>{
    const dir=root();
    const addon=path.join(dir,'addon.js');
    writeFileSync(addon,'module.exports = {}');
    for(const file of ['encoder.onnx','decoder.onnx','joiner.onnx','tokens.txt'])
      writeFileSync(path.join(dir,file),'fixture');

    class StubWorker extends EventEmitter {
      postMessage=vi.fn();
      terminate=vi.fn(async()=>0);
    }
    const worker=new StubWorker();
    const owner={
      isDestroyed:()=>false,
      send:vi.fn(),
      once:vi.fn(),
    } as unknown as WebContents;
    const other={...owner} as WebContents;
    const engine=new OfflineAsr(dir,addon,()=>{
      queueMicrotask(()=>worker.emit('message',{type:'ready'}));
      return worker as unknown as Worker;
    });
    const started=await engine.open(owner);
    expect(started.ok).toBe(true);
    if(!started.ok)return;
    engine.push(other,started.sessionId,new Float32Array(1600));
    engine.push(owner,'wrong-id',new Float32Array(1600));
    engine.push(owner,started.sessionId,new Float32Array([NaN]));
    engine.push(owner,started.sessionId,new Float32Array([2]));
    engine.push(owner,started.sessionId,new Float32Array(3201));
    expect(worker.postMessage).not.toHaveBeenCalled();

    for(let i=0;i<20;i++)engine.push(owner,started.sessionId,new Float32Array(1600));
    expect(worker.postMessage).toHaveBeenCalledTimes(20);
    worker.emit('message',{type:'drained'});
    engine.push(owner,started.sessionId,new Float32Array(1600));
    expect(worker.postMessage).toHaveBeenCalledTimes(21);
    engine.push(owner,started.sessionId,new Float32Array(1600));
    expect(owner.send).toHaveBeenCalledWith('voxnelo:asr:error',{
      sessionId:started.sessionId,reason:'overloaded',
    });
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    engine.close();
  });

  it('permits only the session owner to end ASR and returns the final text on finish',async()=>{
    const dir=root();
    const addon=path.join(dir,'addon.js');
    writeFileSync(addon,'module.exports = {}');
    for(const file of ['encoder.onnx','decoder.onnx','joiner.onnx','tokens.txt'])
      writeFileSync(path.join(dir,file),'fixture');
    class StubWorker extends EventEmitter {
      postMessage=vi.fn();
      terminate=vi.fn(async()=>0);
    }
    const worker=new StubWorker();
    const owner={isDestroyed:()=>false,send:vi.fn(),once:vi.fn()} as unknown as WebContents;
    const stranger={isDestroyed:()=>false,send:vi.fn(),once:vi.fn()} as unknown as WebContents;
    const engine=new OfflineAsr(dir,addon,()=>{
      queueMicrotask(()=>worker.emit('message',{type:'ready'}));
      return worker as unknown as Worker;
    });
    const opened=await engine.open(owner);
    if(!opened.ok)throw Error('worker start failed');
    expect(await engine.stop(stranger,opened.sessionId)).toEqual({finalText:''});
    expect(worker.postMessage).not.toHaveBeenCalled();
    const finished=engine.stop(owner,opened.sessionId);
    expect(worker.postMessage).toHaveBeenCalledWith({type:'finish'});
    worker.emit('message',{type:'result',finalText:'How are you?',interimText:''});
    worker.emit('message',{type:'finished'});
    expect(await finished).toEqual({finalText:'How are you?'});
    engine.close();
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
