import { existsSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Worker } from 'node:worker_threads';
import type { WebContents } from 'electron';

export type AsrCapability={available:boolean;reason:'ready'|'not-configured'};
export type AsrOpenResult={ok:true;sessionId:string}|{ok:false;reason:'not-configured'|'busy'|'failed'};
interface Session {id:string;owner:WebContents;worker:Worker;ready:boolean;accepting:boolean;stopTimer:ReturnType<typeof setTimeout>|null;lastText:string;resolveFinish:((result:{finalText:string})=>void)|null;}
const expected=['encoder.onnx','decoder.onnx','joiner.onnx','tokens.txt'];
/**
 * Experimental offline recognizer. Never run dynamic addon code from a page:
 * paths are developer-provided at app startup, and unavailable in packaged
 * builds until native binary + model redistribution has been audited.
 */
export class OfflineAsr {
  private session:Session|null=null;
  constructor(private readonly modelDir:string|null,private readonly addonPath:string|null){}
  capabilities():AsrCapability{
    if(!this.modelDir||!this.addonPath||!path.isAbsolute(this.modelDir)||!path.isAbsolute(this.addonPath))return {available:false,reason:'not-configured'};
    if(!existsSync(this.addonPath)||!expected.every(name=>existsSync(path.join(this.modelDir!,name))))return {available:false,reason:'not-configured'};
    return {available:true,reason:'ready'};
  }
  async open(owner:WebContents):Promise<AsrOpenResult>{
    if(this.session)return {ok:false,reason:'busy'};
    if(!this.capabilities().available)return {ok:false,reason:'not-configured'};
    const id=randomUUID();
    const worker=new Worker(path.join(__dirname,'offlineAsrWorker.cjs'),{
      workerData:{modelDir:this.modelDir,addonPath:this.addonPath},
    });
    const session:Session={id,owner,worker,ready:false,accepting:false,stopTimer:null,lastText:'',resolveFinish:null};
    this.session=session;
    return new Promise(resolve=>{
      let settled=false;
      const settle=(result:AsrOpenResult)=>{if(settled)return;settled=true;clearTimeout(timeout);resolve(result);};
      const dispose=()=>{if(this.session===session)this.dispose(session);};
      const timeout=setTimeout(()=>{dispose();settle({ok:false,reason:'failed'});},12000);
      worker.on('message',(message:unknown)=>{
        if(!message||typeof message!=='object'||!('type' in message))return;
        const result=message as {type:string;finalText?:unknown;interimText?:unknown};
        if(result.type==='ready'){
          session.ready=true;session.accepting=true;settle({ok:true,sessionId:id});
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
          dispose();
        }
      });
      worker.on('error',()=>{dispose();settle({ok:false,reason:'failed'});});
      worker.on('exit',()=>{dispose();settle({ok:false,reason:'failed'});});
      owner.once('destroyed',dispose);
    });
  }
  push(owner:WebContents,id:unknown,input:unknown):void{
    const s=this.session;
    if(!s||s.owner!==owner||id!==s.id||!s.ready||!s.accepting)return;
    // Exactly one 16kHz, mono, bounded PCM chunk. Reject NaN/Infinity.
    if(!(input instanceof Float32Array)||input.length<1||input.length>3200)return;
    for(const value of input){if(!Number.isFinite(value)||Math.abs(value)>1)return;}
    s.worker.postMessage({type:'pcm',samples:input});
  }
  stop(owner:WebContents,id:unknown):Promise<{finalText:string}>{
    const s=this.session;
    if(!s||s.owner!==owner||id!==s.id)return Promise.resolve({finalText:''});
    if(!s.accepting)return Promise.resolve({finalText:s.lastText});
    s.accepting=false;
    return new Promise(resolve=>{
      s.resolveFinish=resolve;
      s.worker.postMessage({type:'finish'});
      s.stopTimer=setTimeout(()=>this.dispose(s),1500);
    });
  }
  close():void{if(this.session)this.dispose(this.session);}
  private dispose(s:Session):void{
    if(this.session!==s)return;
    this.session=null;
    if(s.stopTimer)clearTimeout(s.stopTimer);
    s.resolveFinish?.({finalText:s.lastText});
    void s.worker.terminate();
  }
}
