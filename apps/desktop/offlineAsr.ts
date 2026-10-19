import { existsSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Worker } from 'node:worker_threads';
import type { WebContents } from 'electron';

export type AsrCapability={available:boolean;reason:'ready'|'not-configured'|'missing-addon'|'missing-model'};
export type AsrOpenResult={ok:true;sessionId:string}|{ok:false;reason:'not-configured'|'busy'|'failed'};
/** Only a worker-confirmed finish may be displayed as final recognition. */
export type AsrStopResult={finalText:string;completed:boolean};
interface Session {
  id:string;owner:WebContents;worker:Worker;ready:boolean;accepting:boolean;
  pendingChunks:number;stopTimer:ReturnType<typeof setTimeout>|null;
  lastText:string;finishPromise:Promise<AsrStopResult>|null;
  resolveFinish:((result:AsrStopResult)=>void)|null;
  resolveOpen:((result:AsrOpenResult)=>void)|null;
}
/** At 100ms chunks, stop on >2s of ASR backlog instead of silently dropping speech. */
const MAX_PENDING_PCM_CHUNKS=20;
// Native decoding can need several seconds to flush the last speech frames.
// Do not truncate the final transcript after only 1.5 seconds.
const FINISH_GRACE_MS=8000;
const expected=['encoder.onnx','decoder.onnx','joiner.onnx','tokens.txt'];
/**
 * Experimental offline recognizer. Never run dynamic addon code from a page:
 * paths are developer-provided in development or point to resources that a
 * release maintainer explicitly staged and vetted before creating the installer.
 */
export class OfflineAsr {
  private session:Session|null=null;
  constructor(
    private readonly modelDir:string|null,
    private readonly addonPath:string|null,
    private readonly spawnWorker:(data:{modelDir:string|null;addonPath:string|null})=>Worker=
      data=>new Worker(path.join(__dirname,'offlineAsrWorker.cjs'),{workerData:data}),
  ){}
  capabilities():AsrCapability{
    if(!this.modelDir||!this.addonPath||!path.isAbsolute(this.modelDir)||!path.isAbsolute(this.addonPath))return {available:false,reason:'not-configured'};
    if(!existsSync(this.addonPath))return {available:false,reason:'missing-addon'};
    if(!expected.every(name=>existsSync(path.join(this.modelDir!,name))))return {available:false,reason:'missing-model'};
    return {available:true,reason:'ready'};
  }
  async open(owner:WebContents):Promise<AsrOpenResult>{
    if(this.session)return {ok:false,reason:'busy'};
    if(!this.capabilities().available)return {ok:false,reason:'not-configured'};
    const id=randomUUID();
    let worker:Worker;
    try{
      worker=this.spawnWorker({modelDir:this.modelDir,addonPath:this.addonPath});
    }catch{
      return {ok:false,reason:'failed'};
    }
    const session:Session={id,owner,worker,ready:false,accepting:false,pendingChunks:0,stopTimer:null,lastText:'',finishPromise:null,resolveFinish:null,resolveOpen:null};
    this.session=session;
    return new Promise(resolve=>{
      let settled=false;
      const settle=(result:AsrOpenResult)=>{
        if(settled)return;
        settled=true;session.resolveOpen=null;clearTimeout(timeout);resolve(result);
      };
      session.resolveOpen=settle;
      const dispose=()=>{if(this.session===session)this.dispose(session);};
      const timeout=setTimeout(()=>{dispose();settle({ok:false,reason:'failed'});},12000);
      worker.on('message',(message:unknown)=>{
        // A terminated worker can still have queued messages. Never publish
        // them or mark a superseded session ready.
        if(this.session!==session)return;
        if(!message||typeof message!=='object'||!('type' in message))return;
        const result=message as {type:string;finalText?:unknown;interimText?:unknown};
        if(result.type==='ready'){
          session.ready=true;session.accepting=true;settle({ok:true,sessionId:id});
        }else if(result.type==='drained'){
          session.pendingChunks=Math.max(0,session.pendingChunks-1);
        }else if(result.type==='result'&&session.ready&&!owner.isDestroyed()){
          // Do not send arbitrary worker data: bound strings only.
          const finalText=typeof result.finalText==='string'?result.finalText.slice(0,8000):'';
          const interimText=typeof result.interimText==='string'?result.interimText.slice(0,1000):'';
          session.lastText=finalText || session.lastText;
          owner.send('voxnelo:asr:result',{sessionId:id,finalText,interimText});
        }else if(result.type==='failure'){
          if(session.ready&&!owner.isDestroyed())owner.send('voxnelo:asr:error',{sessionId:id});
          dispose();settle({ok:false,reason:'failed'});
        }else if(result.type==='finished'){
          this.dispose(session,true);
        }
      });
      const workerFailed=()=>{
        if(this.session!==session)return;
        if(session.ready&&!owner.isDestroyed())owner.send('voxnelo:asr:error',{sessionId:id});
        dispose();
        settle({ok:false,reason:'failed'});
      };
      worker.on('error',workerFailed);
      worker.on('exit',workerFailed);
      owner.once('destroyed',dispose);
    });
  }
  push(owner:WebContents,id:unknown,input:unknown):void{
    const s=this.session;
    if(!s||s.owner!==owner||id!==s.id||!s.ready||!s.accepting)return;
    // Exactly one 16kHz, mono, bounded PCM chunk. Reject NaN/Infinity.
    if(!(input instanceof Float32Array)||input.length<1||input.length>3200)return;
    for(const value of input){if(!Number.isFinite(value)||Math.abs(value)>1)return;}
    if(s.pendingChunks>=MAX_PENDING_PCM_CHUNKS){
      // A saturated engine must not silently drop phrases while claiming to listen.
      if(!owner.isDestroyed())owner.send('voxnelo:asr:error',{sessionId:s.id,reason:'overloaded'});
      this.dispose(s);
      return;
    }
    s.pendingChunks++;
    s.worker.postMessage({type:'pcm',samples:input});
  }
  stop(owner:WebContents,id:unknown):Promise<AsrStopResult>{
    const s=this.session;
    if(!s||s.owner!==owner||id!==s.id)return Promise.resolve({finalText:'',completed:false});
    if(!s.accepting)return s.finishPromise??Promise.resolve({finalText:'',completed:false});
    s.accepting=false;
    s.finishPromise=new Promise(resolve=>{
      s.resolveFinish=resolve;
      try{
        s.worker.postMessage({type:'finish'});
        s.stopTimer=setTimeout(()=>this.dispose(s),FINISH_GRACE_MS);
      }catch{
        this.dispose(s);
      }
    });
    return s.finishPromise;
  }
  close():void{if(this.session)this.dispose(this.session);}
  private dispose(s:Session,completed=false):void{
    if(this.session!==s)return;
    this.session=null;
    if(s.stopTimer)clearTimeout(s.stopTimer);
    // Window closure or explicit shutdown can interrupt the startup handshake.
    // Settle immediately rather than hanging until the 12-second timeout.
    s.resolveOpen?.({ok:false,reason:'failed'});
    s.resolveOpen=null;
    // Worker failures, timeouts, window close and overload are NOT completed
    // recognition. Never promote lastText from interim/earlier packets to final.
    s.resolveFinish?.({finalText:completed?s.lastText:'',completed});
    s.resolveFinish=null;
    void s.worker.terminate();
  }
}
