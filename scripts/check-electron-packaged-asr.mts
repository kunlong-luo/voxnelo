#!/usr/bin/env node
/**
 * CI ONLY. Test a *packaged* Linux Voxnelo Electron app with its real native
 * ASR worker, model and preload IPC, using non-user reference PCM bytes.
 * This does NOT impersonate a real physical microphone or license approval.
 */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {existsSync} from 'node:fs';
import {mkdtemp, readFile, mkdir, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

if(process.platform!=='linux'||!process.env.DISPLAY)
  throw Error('Run the packaged Electron ASR test under Linux xvfb-run');
const binary=path.resolve('release/linux-unpacked/voxnelo');
const alternative=path.resolve('release/linux-unpacked/Voxnelo');
const executable=existsSync(binary)?binary:alternative;
if(!existsSync(executable))throw Error('Missing packaged Voxnelo Linux executable');
const ref=path.join(process.env.RUNNER_TEMP??'', 'voxnelo-asr-reference.wav');
const wav=await readFile(ref);
if(wav.toString('ascii',0,4)!=='RIFF'||wav.toString('ascii',8,12)!=='WAVE')
  throw Error('CI reference audio is not a valid RIFF WAV');
let pos=12,data:Buffer|null=null,rate=0,channels=0,bits=0;
while(pos+8<=wav.length){
  const kind=wav.toString('ascii',pos,pos+4);
  const size=wav.readUInt32LE(pos+4);
  const start=pos+8;
  if(start+size>wav.length)throw Error('Truncated reference WAV');
  if(kind==='fmt '&&size>=16){
    rate=wav.readUInt32LE(start+4);
    channels=wav.readUInt16LE(start+2);
    bits=wav.readUInt16LE(start+14);
  }
  if(kind==='data')data=wav.subarray(start,start+size);
  pos=start+size+(size%2);
}
if(!data||rate!==16000||channels!==1||bits!==16)
  throw Error('Packaged ASR smoke requires 16kHz mono PCM16 audio');
const pcmBase64=data.toString('base64');
const evidence=path.resolve('desktop-evidence','packaged-asr');
await mkdir(evidence,{recursive:true});
const profile=await mkdtemp(path.join(tmpdir(),'voxnelo-asr-electron-'));
let child:ReturnType<typeof spawn>|undefined;
let wm:ReturnType<typeof spawn>|undefined;
let socket:WebSocket|undefined;
let stderr='';
let seq=0;
type Packet={result?:{value?:unknown};exceptionDetails?:{text:string}};
const pending=new Map<number,{resolve:(v:Packet)=>void;reject:(e:Error)=>void;timeout:ReturnType<typeof setTimeout>}>();
const wait=(ms:number)=>new Promise<void>(r=>setTimeout(r,ms));
const port=()=>new Promise<number>((resolve,reject)=>{
  const server=createServer();
  server.once('error',reject);
  server.listen(0,'127.0.0.1',()=>{
    const address=server.address();
    if(!address||typeof address==='string'){reject(Error('No debug port'));return;}
    server.close(()=>resolve(address.port));
  });
});
const send=(method:string,params:Record<string,unknown>={})=>new Promise<Packet>((resolve,reject)=>{
  if(!socket||socket.readyState!==WebSocket.OPEN){reject(Error('CDP connection unavailable'));return;}
  const id=++seq;
  const timeout=setTimeout(()=>{pending.delete(id);reject(Error('Timed out using CDP: '+method));},35000);
  pending.set(id,{resolve,reject,timeout});
  socket.send(JSON.stringify({id,method,params}));
});
const evaluate=async <T=unknown,>(expression:string):Promise<T>=>{
  const reply=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
  if(reply.exceptionDetails)throw Error('Packaged renderer exception: '+reply.exceptionDetails.text);
  return reply.result?.value as T;
};
const report:Record<string,unknown>={result:'pending',platform:'linux',realModel:true,packaged:true,syntheticAudio:true};
try{
  wm=spawn('openbox',['--sm-disable'],{stdio:'ignore'});
  await wait(450);
  const debugPort=await port();
  child=spawn(executable,[
    '--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
    '--user-data-dir='+profile,'--remote-debugging-port='+debugPort,
  ],{stdio:['ignore','ignore','pipe'],env:{...process.env}});
  child.stderr?.on('data',(chunk:Buffer)=>{stderr=(stderr+String(chunk)).slice(-10000)});
  let endpoint:string|undefined;
  for(let i=0;i<140;i++){
    if(child.exitCode!==null)throw Error('Packaged Electron exited: '+stderr);
    try{
      const response=await fetch('http://127.0.0.1:'+debugPort+'/json/list');
      if(response.ok){
        const pages=await response.json() as Array<{type:string;url:string;webSocketDebuggerUrl:string}>;
        endpoint=pages.find(p=>p.type==='page'&&p.url.startsWith('voxnelo://app/'))?.webSocketDebuggerUrl;
        if(endpoint)break;
      }
    }catch{/* Electron is still starting. */}
    await wait(145);
  }
  if(!endpoint)throw Error('Could not open packaged Electron renderer: '+stderr);
  const active=new WebSocket(endpoint);
  socket=active;
  await new Promise<void>((resolve,reject)=>{
    active.addEventListener('open',()=>resolve(),{once:true});
    active.addEventListener('error',()=>reject(Error('CDP websocket failed')),{once:true});
  });
  active.addEventListener('message',event=>{
    const value=JSON.parse(String(event.data)) as {id?:number;error?:unknown;result?:Packet};
    if(value.id===undefined)return;
    const current=pending.get(value.id);
    if(!current)return;
    clearTimeout(current.timeout);pending.delete(value.id);
    if(value.error)current.reject(Error(String(JSON.stringify(value.error))));
    else current.resolve(value.result??{});
  });
  await send('Runtime.enable');
  const capability=await evaluate<{available:boolean;reason:string}>('window.voxneloDesktop.asr.capabilities()');
  assert.equal(capability.available,true,'Packaged Electron ASR unavailable: '+JSON.stringify(capability));
  const open=await evaluate<{ok:boolean;sessionId?:string;reason?:string}>('window.voxneloDesktop.asr.start()');
  assert.ok(open.ok&&open.sessionId,'Packaged Electron could not start actual native worker: '+JSON.stringify(open));
  const speech=await evaluate<{finalText:string;resultCount:number;errorCount:number}>(
    `(async()=>{
      const asr=window.voxneloDesktop.asr;
      const sessionId=${JSON.stringify(open.sessionId)};
      const bytes=Uint8Array.from(atob(${JSON.stringify(pcmBase64)}),ch=>ch.charCodeAt(0));
      const reader=new DataView(bytes.buffer);
      let resultCount=0,errorCount=0;
      const unbindResult=asr.onResult(result=>{
        if(result.sessionId===sessionId)resultCount++;
      });
      const unbindError=asr.onError(id=>{if(id===sessionId)errorCount++;});
      try{
        for(let p=0;p<bytes.length;p+=3200){
          const count=Math.min(1600,(bytes.length-p)/2);
          const chunk=new Float32Array(count);
          for(let i=0;i<count;i++)chunk[i]=reader.getInt16(p+i*2,true)/32768;
          asr.push(sessionId,chunk);
          await new Promise(resolve=>setTimeout(resolve,100));
        }
        const done=await asr.stop(sessionId);
        return {finalText:done.finalText,resultCount,errorCount};
      }finally{unbindResult();unbindError();}
    })()`
  );
  assert.equal(speech.errorCount,0,'Packaged native ASR reported worker errors');
  assert.ok(speech.finalText.trim(),'Packaged Electron produced no actual final English transcript');
  assert.match(speech.finalText,/english/i,'Packaged recognizer failed the English reference');
  assert.match(speech.finalText,/slowly/i,'Packaged recognizer failed the end of reference sentence');
  assert.ok(speech.resultCount>0,'Packaged renderer received no streaming ASR result events');
  report.result='passed';
  report.speech=speech;
  console.log('Actual packaged Electron offline ASR worker/PCM IPC passed:',JSON.stringify(speech));
}catch(error){
  report.result='failed';
  report.error=String(error instanceof Error?error.stack??error.message:error);
  report.stderr=stderr;
  console.error(error);
  process.exitCode=1;
}finally{
  await writeFile(path.join(evidence,'report.json'),JSON.stringify(report,null,2)+'\n');
  if(socket)socket.close();
  for(const entry of pending.values()){clearTimeout(entry.timeout);entry.reject(Error('Electron closing'));}
  pending.clear();
  if(child&&child.exitCode===null){
    child.kill('SIGTERM');
    await Promise.race([new Promise<void>(r=>child?.once('exit',()=>r())),wait(3500)]);
    if(child.exitCode===null)child.kill('SIGKILL');
  }
  if(wm&&wm.exitCode===null)wm.kill('SIGTERM');
  await rm(profile,{recursive:true,force:true});
}
