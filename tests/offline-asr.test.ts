import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import type { Worker } from 'node:worker_threads';
import type { WebContents } from 'electron';
import { vi } from 'vitest';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { OfflineAsr } from '../apps/desktop/offlineAsr';
import { isPersonalAsrCandidate, resolveAsrAssets, resolveVerifiedAsrAssets, verifyPersonalAsrCandidate, verifyPersonalAsrInventory } from '../apps/desktop/asrAssets';

const roots:string[]=[];
afterEach(()=>roots.splice(0).forEach(dir=>rmSync(dir,{recursive:true,force:true})));
function root() {
  const dir=mkdtempSync(path.join(tmpdir(),'voxnelo-asr-test-'));
  roots.push(dir);
  return dir;
}

describe('Trusted offline ASR bundle discovery',()=>{
  it('reads pre-vetted assets only from packaged application resources',()=>{
    const resolved=resolveAsrAssets({
      isPackaged:true,
      resourcesPath:path.join('tmp','Voxnelo','resources'),
      developerModelDir:'/tmp/untrusted-model',
      developerAddonPath:'/tmp/untrusted.node',
    });
    expect(resolved.modelDir).toBe(path.join('tmp','Voxnelo','resources','offline-asr','model'));
    expect(resolved.addonPath).toBe(path.join('tmp','Voxnelo','resources','offline-asr','native','index.cjs'));
  });

  it('loads only an explicitly consented, platform-pinned personal native ASR pilot in the installed app',()=>{
    const base=root();
    const folder=path.join(base,'offline-asr');
    const model=path.join(folder,'model'),native=path.join(folder,'native');
    mkdirSync(model,{recursive:true});
    mkdirSync(path.join(native,'node_modules','sherpa-onnx-node'),{recursive:true});
    const entry=path.join(native,'index.cjs');
    const fixtureSha='a'.repeat(64);
    for(const file of ['encoder.onnx','decoder.onnx','joiner.onnx','tokens.txt'])writeFileSync(path.join(model,file),'test fixture');
    writeFileSync(entry,'module.exports = {}');
    writeFileSync(path.join(native,'node_modules','sherpa-onnx-node','fake.node'),'test fixture');
    const sha256:Record<string,string>=Object.fromEntries([
      ...['encoder.onnx','decoder.onnx','joiner.onnx','tokens.txt'].map(n=>['model/'+n,fixtureSha]),
      ['native/index.cjs',fixtureSha],
      ['native/node_modules/sherpa-onnx-node/fake.node',fixtureSha],
    ]);
    const manifest={
      releaseReady:false,reviewState:'engineering-only; native redistribution and signing not approved',
      modelRevision:'bfbb11950302dad9955f8ede01f0e768595e4fba',
      nativePackage:'sherpa-onnx-node',nativeVersion:'1.13.8',
      platform:process.platform,arch:process.arch,sha256,
    };
    writeFileSync(path.join(folder,'manifest.json'),JSON.stringify(manifest));
    const options={isPackaged:true,resourcesPath:path.join(base,'packaged','resources'),personalDataDir:base};
    expect(isPersonalAsrCandidate(folder)).toBe(false);
    expect(resolveAsrAssets(options).addonPath).toContain('packaged');
    writeFileSync(path.join(folder,'personal-install.json'),JSON.stringify({optIn:true,platform:process.platform,arch:process.arch}));
    expect(isPersonalAsrCandidate(folder)).toBe(true);
    expect(resolveAsrAssets(options)).toEqual({modelDir:model,addonPath:entry});
    writeFileSync(path.join(folder,'manifest.json'),JSON.stringify({...manifest,nativeVersion:'0.0.0'}));
    expect(isPersonalAsrCandidate(folder)).toBe(false);
    expect(resolveAsrAssets(options).addonPath).toContain('packaged');
  });

  it('stream-verifies every personal model and native file, rejects edits and unexpected files',async()=>{
    const base=root();
    const pilot=path.join(base,'offline-asr');
    const files:Record<string,string>={
      'model/encoder.onnx':'sample-encoder','model/decoder.onnx':'sample-decoder',
      'model/joiner.onnx':'sample-joiner','model/tokens.txt':'sample-tokens',
      'native/index.cjs':"module.exports = require('./node_modules/sherpa-onnx-node');\n",
      'native/node_modules/sherpa-onnx-node/index.js':'module.exports = {}',
      'native/node_modules/sherpa-onnx-node/native.node':'fixture native addon',
    };
    const hashes:Record<string,string>={};
    for(const [name,data] of Object.entries(files)){
      const full=path.join(pilot,...name.split('/'));
      mkdirSync(path.dirname(full),{recursive:true});
      writeFileSync(full,data);
      hashes[name]=createHash('sha256').update(data).digest('hex');
    }
    writeFileSync(path.join(pilot,'manifest.json'),JSON.stringify({
      releaseReady:false,reviewState:'engineering-only; native redistribution not approved',
      modelRevision:'bfbb11950302dad9955f8ede01f0e768595e4fba',
      nativePackage:'sherpa-onnx-node',nativeVersion:'1.13.8',
      platform:process.platform,arch:process.arch,sha256:hashes,
    }));
    writeFileSync(path.join(pilot,'personal-install.json'),JSON.stringify({
      optIn:true,platform:process.platform,arch:process.arch,
    }));
    expect(isPersonalAsrCandidate(pilot)).toBe(true);
    expect(await verifyPersonalAsrInventory(pilot)).toBe(true);
    // Inventory digests are self-declared: the application separately pins
    // known ONNX hashes, so a fabricated manifest cannot authorize an addon.
    expect(await verifyPersonalAsrCandidate(pilot)).toBe(false);
    const resolved=await resolveVerifiedAsrAssets({
      isPackaged:true,resourcesPath:path.join(base,'packaged'),personalDataDir:base,
    });
    expect(resolved.addonPath).toBe(path.join(base,'packaged','offline-asr','native','index.cjs'));

    writeFileSync(path.join(pilot,'model','tokens.txt'),'unexpected change');
    expect(await verifyPersonalAsrInventory(pilot)).toBe(false);
    writeFileSync(path.join(pilot,'model','tokens.txt'),files['model/tokens.txt']!);
    expect(await verifyPersonalAsrInventory(pilot)).toBe(true);
    writeFileSync(path.join(pilot,'native','extra.cjs'),'not in manifest');
    expect(await verifyPersonalAsrInventory(pilot)).toBe(false);
    rmSync(path.join(pilot,'native','extra.cjs'));
    symlinkSync('tokens.txt',path.join(pilot,'model','unexpected-link'));
    expect(await verifyPersonalAsrInventory(pilot)).toBe(false);
  });

  it('preserves developer-only absolute paths without allowing IPC path selection',()=>{
    const resolved=resolveAsrAssets({
      isPackaged:false,resourcesPath:'/unused',
      developerModelDir:'/opt/verified/model',
      developerAddonPath:'/opt/verified/native.node',
    });
    expect(resolved).toEqual({
      modelDir:'/opt/verified/model',
      addonPath:'/opt/verified/native.node',
    });
    expect(resolveAsrAssets({isPackaged:false,resourcesPath:'/unused'}))
      .toEqual({modelDir:null,addonPath:null});
  });

  it('distinguishes missing native module and model files from a ready bundle',()=>{
    const dir=root();
    const modelDir=path.join(dir,'model');
    mkdirSync(modelDir);
    const addon=path.join(dir,'native.node');
    const engine=new OfflineAsr(modelDir,addon);
    expect(engine.capabilities()).toEqual({available:false,reason:'missing-addon'});
    writeFileSync(addon,'test-only fixture');
    expect(engine.capabilities()).toEqual({available:false,reason:'missing-model'});
    for(const name of ['encoder.onnx','decoder.onnx','joiner.onnx','tokens.txt'])
      writeFileSync(path.join(modelDir,name),'fixture');
    expect(engine.capabilities()).toEqual({available:true,reason:'ready'});
  });
});

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
    expect(await engine.stop(stranger,opened.sessionId)).toEqual({finalText:'',completed:false});
    expect(worker.postMessage).not.toHaveBeenCalled();
    const finished=engine.stop(owner,opened.sessionId);
    expect(worker.postMessage).toHaveBeenCalledWith({type:'finish'});
    worker.emit('message',{type:'result',finalText:'How are you?',interimText:''});
    worker.emit('message',{type:'finished'});
    expect(await finished).toEqual({finalText:'How are you?',completed:true});
    engine.close();
  });

  it('makes repeated stop requests await the SAME real final recognition flush',async()=>{
    const dir=root();
    const addon=path.join(dir,'native.cjs');
    writeFileSync(addon,'fixture');
    for(const name of ['encoder.onnx','decoder.onnx','joiner.onnx','tokens.txt'])
      writeFileSync(path.join(dir,name),'fixture');
    class WorkerStub extends EventEmitter {
      postMessage=vi.fn();
      terminate=vi.fn(async()=>0);
    }
    const worker=new WorkerStub();
    const owner={isDestroyed:()=>false,send:vi.fn(),once:vi.fn()} as unknown as WebContents;
    const engine=new OfflineAsr(dir,addon,()=>{
      queueMicrotask(()=>worker.emit('message',{type:'ready'}));
      return worker as unknown as Worker;
    });
    const opened=await engine.open(owner);
    if(!opened.ok)throw Error('No real worker session opened');
    const first=engine.stop(owner,opened.sessionId);
    const second=engine.stop(owner,opened.sessionId);
    expect(second).toBe(first);
    expect(worker.postMessage).toHaveBeenCalledTimes(1);
    expect(worker.postMessage).toHaveBeenCalledWith({type:'finish'});
    worker.emit('message',{type:'result',finalText:'the finished English sentence',interimText:''});
    worker.emit('message',{type:'finished'});
    expect(await first).toEqual({finalText:'the finished English sentence',completed:true});
    expect(await second).toEqual({finalText:'the finished English sentence',completed:true});
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    engine.close();
  });

  it('does not treat a cached partial result as finished when the worker fails after Stop',async()=>{
    const dir=root();
    const addon=path.join(dir,'native.cjs');
    writeFileSync(addon,'fixture');
    for(const file of ['encoder.onnx','decoder.onnx','joiner.onnx','tokens.txt'])
      writeFileSync(path.join(dir,file),'fixture');
    class WorkerStub extends EventEmitter {
      postMessage=vi.fn();
      terminate=vi.fn(async()=>0);
    }
    const worker=new WorkerStub();
    const owner={isDestroyed:()=>false,send:vi.fn(),once:vi.fn()} as unknown as WebContents;
    const engine=new OfflineAsr(dir,addon,()=>{
      queueMicrotask(()=>worker.emit('message',{type:'ready'}));
      return worker as unknown as Worker;
    });
    const opened=await engine.open(owner);
    if(!opened.ok)throw Error('Worker did not start');
    worker.emit('message',{type:'result',finalText:'only part of this sentence',interimText:'of'});
    const pending=engine.stop(owner,opened.sessionId);
    worker.emit('message',{type:'failure'});
    expect(await pending).toEqual({finalText:'',completed:false});
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(owner.send).toHaveBeenCalledWith('voxnelo:asr:error',{sessionId:opened.sessionId});
    worker.emit('message',{type:'finished'}); // late success is ignored
    expect(await pending).toEqual({finalText:'',completed:false});
  });

  it('returns explicit incomplete stop on native finish timeout instead of promoting lastText',async()=>{
    const dir=root();
    const addon=path.join(dir,'native.cjs');
    writeFileSync(addon,'fixture');
    for(const file of ['encoder.onnx','decoder.onnx','joiner.onnx','tokens.txt'])
      writeFileSync(path.join(dir,file),'fixture');
    class WorkerStub extends EventEmitter {
      postMessage=vi.fn();
      terminate=vi.fn(async()=>0);
    }
    const worker=new WorkerStub();
    const owner={isDestroyed:()=>false,send:vi.fn(),once:vi.fn()} as unknown as WebContents;
    const engine=new OfflineAsr(dir,addon,()=>{
      queueMicrotask(()=>worker.emit('message',{type:'ready'}));
      return worker as unknown as Worker;
    });
    const opened=await engine.open(owner);
    if(!opened.ok)throw Error('Worker did not start');
    worker.emit('message',{type:'result',finalText:'stale cached partial',interimText:''});
    vi.useFakeTimers();
    try{
      const pending=engine.stop(owner,opened.sessionId);
      await vi.advanceTimersByTimeAsync(8001);
      expect(await pending).toEqual({finalText:'',completed:false});
      expect(worker.terminate).toHaveBeenCalledOnce();
      expect(await engine.stop(owner,opened.sessionId)).toEqual({finalText:'',completed:false});
    }finally{
      vi.useRealTimers();
      engine.close();
    }
  });

  it('resolves an in-flight startup immediately if its owner is destroyed',async()=>{
    const dir=root();
    const addon=path.join(dir,'native.cjs');
    writeFileSync(addon,'fixture');
    for(const name of ['encoder.onnx','decoder.onnx','joiner.onnx','tokens.txt'])
      writeFileSync(path.join(dir,name),'fixture');
    class WorkerStub extends EventEmitter {
      postMessage=vi.fn();
      terminate=vi.fn(async()=>0);
    }
    const worker=new WorkerStub();
    let destroy:(()=>void)|undefined;
    const owner={
      isDestroyed:()=>false,send:vi.fn(),
      once:vi.fn((name:string,fn:()=>void)=>{if(name==='destroyed')destroy=fn;}),
    } as unknown as WebContents;
    const engine=new OfflineAsr(dir,addon,()=>worker as unknown as Worker);
    const pending=engine.open(owner);
    expect(destroy).toBeTypeOf('function');
    destroy?.();
    expect(await pending).toEqual({ok:false,reason:'failed'});
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    worker.emit('message',{type:'ready'});
    expect(await engine.stop(owner,'superseded')).toEqual({finalText:'',completed:false});
  });

  it('ignores late messages from an already disposed session when a new one starts',async()=>{
    const dir=root();
    const addon=path.join(dir,'native.cjs');
    writeFileSync(addon,'fixture');
    for(const name of ['encoder.onnx','decoder.onnx','joiner.onnx','tokens.txt'])
      writeFileSync(path.join(dir,name),'fixture');
    class WorkerStub extends EventEmitter {
      postMessage=vi.fn();
      terminate=vi.fn(async()=>0);
    }
    const workers=[new WorkerStub(),new WorkerStub()];
    let spawned=0;
    const owner={isDestroyed:()=>false,send:vi.fn(),once:vi.fn()} as unknown as WebContents;
    const engine=new OfflineAsr(dir,addon,()=>{
      const worker=workers[spawned++];
      if(!worker)throw Error('Unexpected worker');
      queueMicrotask(()=>worker.emit('message',{type:'ready'}));
      return worker as unknown as Worker;
    });
    const first=await engine.open(owner);
    if(!first.ok)throw Error('No first session');
    engine.close();
    const second=await engine.open(owner);
    if(!second.ok)throw Error('No second session');
    workers[0]!.emit('message',{type:'result',finalText:'old sentence',interimText:''});
    workers[0]!.emit('message',{type:'failure'});
    workers[0]!.emit('message',{type:'finished'});
    expect(owner.send).not.toHaveBeenCalled();
    const final=engine.stop(owner,second.sessionId);
    workers[1]!.emit('message',{type:'result',finalText:'fresh sentence',interimText:''});
    workers[1]!.emit('message',{type:'finished'});
    expect(await final).toEqual({finalText:'fresh sentence',completed:true});
    expect(owner.send).toHaveBeenCalledWith('voxnelo:asr:result',{
      sessionId:second.sessionId,finalText:'fresh sentence',interimText:'',
    });
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
