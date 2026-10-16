#!/usr/bin/env node
/**
 * V0.1 F006-F009: test the real Electron renderer and Chromium IndexedDB
 * across TWO app processes sharing a fresh, temporary user-data directory.
 * UI interactions use production buttons; IndexedDB is inspected read-only.
 *
 * Run on Linux: xvfb-run -a node --experimental-strip-types scripts/check-electron-persistence.mts
 * This does not replace installed-package or real-device acceptance.
 */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

if(process.platform!=='linux'||!process.env.DISPLAY)throw Error('Use this smoke test under xvfb-run on Linux');
const evidence=path.resolve('desktop-evidence','persistence');
await mkdir(evidence,{recursive:true});
const profile=await mkdtemp(path.join(tmpdir(),'voxnelo-v01-persistence-'));
const delay=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
const freePort=()=>new Promise<number>((resolve,reject)=>{
  const server=createServer();
  server.once('error',reject);
  server.listen(0,'127.0.0.1',()=>{
    const address=server.address();
    if(!address||typeof address==='string'){reject(Error('No test port'));return;}
    server.close(()=>resolve(address.port));
  });
});
type CdpPacket={result?:{value?:unknown};exceptionDetails?:{text:string};[key:string]:unknown};
type StoreSnapshot={states:Array<{sentenceId:string;seenCount:number;practicedCount:number;favorite:boolean;review:boolean}>;events:Array<{sentenceId:string;type:string;at:number}>};
const readDbExpression=String.raw`new Promise((resolve,reject)=>{
  const request=indexedDB.open('voxnelo-v01');
  request.onerror=()=>reject(new Error('IndexedDB open failed'));
  request.onsuccess=()=>{
    const db=request.result;
    const tx=db.transaction(['states','events'],'readonly');
    const states=tx.objectStore('states').getAll();
    const events=tx.objectStore('events').getAll();
    tx.oncomplete=()=>{db.close();resolve({states:states.result,events:events.result})};
    tx.onerror=()=>{db.close();reject(new Error('IndexedDB transaction failed'))};
  };
})`;
let electron:ReturnType<typeof spawn>|undefined;
let wm:ReturnType<typeof spawn>|undefined;
let socket:WebSocket|undefined;
let seq=0, stderr='';
const pending=new Map<number,{resolve:(r:CdpPacket)=>void;reject:(e:Error)=>void;timeout:ReturnType<typeof setTimeout>}>();
const send=(method:string,params:Record<string,unknown>={})=>new Promise<CdpPacket>((resolve,reject)=>{
  if(!socket||socket.readyState!==WebSocket.OPEN){reject(Error('Electron CDP socket not connected'));return;}
  const id=++seq;
  const timeout=setTimeout(()=>{pending.delete(id);reject(Error('Electron CDP timed out: '+method))},12000);
  pending.set(id,{resolve,reject,timeout});
  socket.send(JSON.stringify({id,method,params}));
});
const evaluate=async <T=unknown>(expression:string):Promise<T>=>{
  const response=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
  if(response.exceptionDetails)throw Error('Renderer evaluation failed: '+response.exceptionDetails.text);
  return response.result?.value as T;
};
const until=async(expression:string,timeoutMs=12000)=>{
  const since=Date.now();
  while(Date.now()-since<timeoutMs){
    try{if(await evaluate(expression))return;}catch{/* Renderer can still be loading. */}
    await delay(150);
  }
  throw Error('Timed out: '+expression);
};
const openElectron=async()=>{
  const port=await freePort();
  electron=spawn(path.resolve('node_modules/.bin/electron'),[
    '.','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
    '--user-data-dir='+profile,'--remote-debugging-port='+port
  ],{cwd:path.resolve('.'),env:{...process.env,ELECTRON_DISABLE_SECURITY_WARNINGS:'false'},stdio:['ignore','ignore','pipe']});
  electron.stderr?.on('data',(chunk:Buffer)=>{stderr=(stderr+String(chunk)).slice(-7000)});
  let endpoint:string|undefined;
  for(let i=0;i<160;i++){
    if(electron.exitCode!==null)throw Error('Electron exited on startup: '+stderr);
    try{
      const response=await fetch('http://127.0.0.1:'+port+'/json/list');
      if(response.ok){
        const pages=await response.json() as Array<{type:string;url:string;webSocketDebuggerUrl:string}>;
        endpoint=pages.find(page=>page.type==='page'&&page.url.startsWith('voxnelo://app/'))?.webSocketDebuggerUrl;
        if(endpoint)break;
      }
    }catch{/* CDP port not ready yet. */}
    await delay(140);
  }
  if(!endpoint)throw Error('Voxnelo renderer did not start: '+stderr);
  const active=new WebSocket(endpoint);
  socket=active;
  await new Promise<void>((resolve,reject)=>{
    active.addEventListener('open',()=>resolve(),{once:true});
    active.addEventListener('error',()=>reject(Error('CDP WebSocket connection failed')),{once:true});
  });
  active.addEventListener('message',event=>{
    const packet=JSON.parse(String(event.data)) as {id?:number;error?:unknown;result?:CdpPacket};
    if(packet.id===undefined)return;
    const entry=pending.get(packet.id);
    if(!entry)return;
    clearTimeout(entry.timeout);
    pending.delete(packet.id);
    if(packet.error)entry.reject(Error(JSON.stringify(packet.error)));
    else entry.resolve(packet.result??{});
  });
  await send('Runtime.enable');
  await until('document.readyState==="complete"&&!!document.querySelector(".lessonFavorite")&&!!window.voxneloDesktop?.windowControls');
  assert.equal(await evaluate('location.protocol'),'voxnelo:','Not running the real Electron app origin');
};
const closeElectron=async()=>{
  if(socket){socket.close();socket=undefined;}
  for(const entry of pending.values()){clearTimeout(entry.timeout);entry.reject(Error('Electron process closed'));}
  pending.clear();
  const child=electron;electron=undefined;
  if(!child||child.exitCode!==null)return;
  await new Promise<void>(resolve=>{
    let done=false;
    const finish=()=>{if(done)return;done=true;clearTimeout(killer);resolve();};
    child.once('exit',finish);
    const killer=setTimeout(()=>{child.kill('SIGKILL');finish()},5000);
    child.kill('SIGTERM');
  });
};
const readDb=()=>evaluate<StoreSnapshot>(readDbExpression);
const awaitSnapshot=async(test:(s:StoreSnapshot)=>boolean)=>{
  for(let i=0;i<70;i++){
    const snapshot=await readDb();
    if(test(snapshot))return snapshot;
    await delay(150);
  }
  throw Error('IndexedDB state did not reach the expected condition');
};
const report:Record<string,unknown>={test:'V0.1 F006-F009 real Electron process restart',result:'pending'};
try{
  wm=spawn('openbox',['--sm-disable'],{stdio:'ignore'});
  await delay(500);
  await openElectron();
  const initialTitle=await evaluate<string>('document.querySelector("h1.sentenceText").textContent');
  const initial=await awaitSnapshot(s=>s.events.some(e=>e.type==='view'));
  const initialId=initial.events.find(e=>e.type==='view')?.sentenceId;
  assert.ok(initialId,'Initial real IndexedDB view was never recorded');
  assert.equal(initial.events.filter(e=>e.type==='practice').length,0,'Viewing must not count as practice');

  await evaluate('document.querySelector(".lessonFavorite").click()');
  await until('document.querySelector(".lessonFavorite")?.getAttribute("aria-pressed")==="true"');
  await evaluate('document.querySelector(".reviewIconButton").click()');
  await until('document.querySelector(".reviewIconButton")?.getAttribute("aria-pressed")==="true"');
  await awaitSnapshot(s=>s.states.some(item=>item.sentenceId===initialId&&item.favorite&&item.review));
  await delay(250);
  await evaluate('document.querySelector(".nextButton").click()');
  await until('document.querySelector("h1.sentenceText")?.textContent!=='+JSON.stringify(initialTitle));
  const nextTitle=await evaluate<string>('document.querySelector("h1.sentenceText").textContent');
  const saved=await awaitSnapshot(s=>s.events.filter(e=>e.type==='view').length>=2);
  const latestView=saved.events.filter(e=>e.type==='view').at(-1);
  assert.ok(latestView&&latestView.sentenceId!==initialId,'Next lesson not saved in actual IndexedDB');
  assert.equal(saved.events.filter(e=>e.type==='practice').length,0,'Browsing counted as practice');
  report.before={initialTitle,nextTitle,initialId,restoredId:latestView.sentenceId,eventCount:saved.events.length};

  await closeElectron();
  await openElectron();
  await until('document.querySelector("h1.sentenceText")?.textContent==='+JSON.stringify(nextTitle),14000);
  const restored=await awaitSnapshot(s=>s.states.some(item=>item.sentenceId===initialId&&item.favorite&&item.review));
  assert.equal(restored.events.filter(e=>e.type==='practice').length,0,'Relaunch unexpectedly counted a practice');
  assert.ok(restored.events.some(e=>e.type==='view'&&e.sentenceId===latestView.sentenceId),'Last lesson history was lost');

  await evaluate('document.querySelectorAll(".sidebar .navItem")[1].click()');
  await until('!!document.querySelector(".libraryPage .libraryList")');
  await until('document.querySelector(".libraryPage .libraryList")?.textContent.includes('+JSON.stringify(initialTitle)+')');
  await evaluate('document.querySelectorAll(".sidebar .navItem")[3].click()');
  await until('document.querySelector(".libraryPage .libraryList")?.textContent.includes('+JSON.stringify(initialTitle)+')');
  report.result='passed';
  report.verified=['two distinct Electron processes with the same temporary profile','real local voxnelo: origin','favorite and review flags','next-sentence history restored','favorite and review library UI after restart','view activity did not count as recorded practice'];
  console.log('V0.1 Electron persistence across process restart passed');
}catch(error){
  report.result='failed';report.error=String(error instanceof Error?error.stack??error.message:error);report.stderr=stderr;
  console.error(error);process.exitCode=1;
}finally{
  await writeFile(path.join(evidence,'report.json'),JSON.stringify(report,null,2));
  await closeElectron();
  if(wm&&wm.exitCode===null)wm.kill('SIGTERM');
  await rm(profile,{recursive:true,force:true});
}
