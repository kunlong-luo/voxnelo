#!/usr/bin/env node
/**
 * Linux Electron integration smoke. Must run INSIDE xvfb-run on CI with an
 * X11 window manager and xdotool installed. Tests the real renderer, preload,
 * local scheme, native window sizing and IPC, not a browser imitation.
 *
 * Never enable automation switches in production app code.
 */
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

if(process.platform!=='linux')throw Error('Linux desktop smoke requires X11');
if(!process.env.DISPLAY)throw Error('Use xvfb-run -a node --experimental-strip-types scripts/check-electron-window.mts');
const scale=Number(process.env.VOXNELO_DPI_SCALE||'1');
if(![1,1.25,1.5].includes(scale))throw Error('Unsupported test DPI: '+scale);
const resultDir=path.resolve('desktop-evidence',scale===1?'standard':'dpi-'+Math.round(scale*100));
await mkdir(resultDir,{recursive:true});
const delay=(ms:number)=>new Promise<void>(r=>setTimeout(r,ms));
const freePort=async():Promise<number>=>new Promise((resolve,reject)=>{
  const server=createServer();
  server.once('error',reject);
  server.listen(0,'127.0.0.1',()=>{
    const address=server.address();
    if(!address||typeof address==='string'){reject(Error('No TCP port'));return;}
    const port=address.port;
    server.close(()=>resolve(port));
  });
});
type CdpReply={result?:{value?:unknown};exceptionDetails?:{text:string};data?:string;[key:string]:unknown};
type DesktopMetrics={width:number;height:number;scrollWidth:number;clientWidth:number;chromeHeight:number;chromePresent:boolean;chromeTop:number;chromeLeft:number;sidebarTop:number;sidebarBottom:number;sidebarRight:number;mainContainer:string;desktopPreload:boolean;desktopPlatform:string;scheme:string;practice:boolean;micBottom:number;micTop:number;railBottom:number;mobileNav:boolean;devicePixelRatio:number};
const port=await freePort();
const report:Array<{label:string;[key:string]:unknown}>=[];
let wm:ReturnType<typeof spawn>|undefined;
let electron:ReturnType<typeof spawn>|undefined;
let socket:WebSocket|undefined;
let sequence=0,stderr='';
const pending=new Map<number,{resolve:(response:CdpReply)=>void;reject:(reason:Error)=>void;timeout:ReturnType<typeof setTimeout>}>();
const send=(method:string,params:Record<string,unknown>={})=>new Promise<CdpReply>((resolve,reject)=>{
  if(!socket){reject(Error('Electron WebSocket is unavailable'));return;}
  const id=++sequence;
  const timeout=setTimeout(()=>{pending.delete(id);reject(Error('Electron CDP timeout: '+method));},12000);
  pending.set(id,{resolve,reject,timeout});
  socket.send(JSON.stringify({id,method,params}));
});
const evaluate=async <T=string,>(expression:string):Promise<T>=>{
  const response=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(response.exceptionDetails)throw Error('Electron renderer eval failed: '+response.exceptionDetails.text);
  return response.result?.value as T;
};
const until=async(expression:string,timeoutMs=10000):Promise<void>=>{
  const began=Date.now();
  while(Date.now()-began<timeoutMs){
    try{if(await evaluate(expression))return;}catch{/* Renderer can reload during startup. */}
    await delay(130);
  }
  throw Error('Timed out: '+expression);
};
const xdo=(...args:string[])=>execFileSync('xdotool',args,{encoding:'utf8',timeout:6000}).trim();
const viewport=async()=>evaluate<DesktopMetrics>('(()=>{const d=document.documentElement;const mic=document.querySelector(".recordAction")?.getBoundingClientRect(),rail=document.querySelector(".actionRail")?.getBoundingClientRect(),title=document.querySelector(".appTitlebar")?.getBoundingClientRect(),sidebar=document.querySelector(".sidebar")?.getBoundingClientRect();const nav=document.querySelector(".mobileNav");return {width:innerWidth,height:innerHeight,scrollWidth:d.scrollWidth,clientWidth:d.clientWidth,chromeHeight:title?.height||0,chromePresent:!!title,chromeTop:Math.round(title?.top??-1),chromeLeft:Math.round(title?.left??-1),sidebarTop:Math.round(sidebar?.top??-1),sidebarBottom:Math.round(sidebar?.bottom??-1),sidebarRight:Math.round(sidebar?.right??-1),mainContainer:getComputedStyle(document.querySelector(".mainArea")).containerName,desktopPreload:!!window.voxneloDesktop?.windowControls,desktopPlatform:window.voxneloDesktop?.platform,scheme:location.protocol,practice:!!document.querySelector(".practiceLayout"),micBottom:Math.round(mic?.bottom||0),micTop:Math.round(mic?.top||0),railBottom:Math.round(rail?.bottom||0),mobileNav:getComputedStyle(nav).display!=="none",devicePixelRatio:devicePixelRatio}})()');
const snapshot=async(label:string,expectedWidth:number,expectedHeight:number):Promise<void>=>{
  await delay(550);
  const state=await viewport();
  report.push({label,...state});
  assert.ok(state.desktopPreload,'Electron preload bridge missing');
  assert.ok(Math.abs(state.devicePixelRatio-scale)<.08,'Electron DPR mismatch at '+label+': '+JSON.stringify(state));
  assert.equal(state.desktopPlatform,'linux','platform bridge mismatch');
  assert.equal(state.scheme,'voxnelo:','local app protocol not used');
  assert.ok(state.chromePresent&&Math.abs(state.chromeHeight-44)<=1,'custom frame missing/wrong height');
  assert.ok(Math.abs(state.sidebarTop)<=1,'left sidebar does not reach window top '+label+': '+JSON.stringify(state));
  assert.ok(state.sidebarBottom>=state.height-1,'left sidebar not full-height '+label+': '+JSON.stringify(state));
  assert.ok(state.chromeTop>=-1&&state.chromeTop<=1,'workspace titlebar not flush to top '+label+': '+JSON.stringify(state));
  assert.ok(Math.abs(state.chromeLeft-state.sidebarRight)<=1,'titlebar still spans the left sidebar '+label+': '+JSON.stringify(state));
  assert.equal(state.mainContainer,'workspace','container query not applied');
  assert.ok(state.practice,'practice not rendered');
  assert.ok(Math.abs(state.width-expectedWidth)<=25&&Math.abs(state.height-expectedHeight)<=25,
    'Electron native viewport wrong for '+label+': '+JSON.stringify(state));
  assert.ok(state.scrollWidth<=state.clientWidth+1,'Electron horizontal overflow '+label);
  assert.ok(state.micBottom>state.micTop&&state.micBottom<=state.height-8,'microphone not first-screen accessible '+label+': '+JSON.stringify(state));
  assert.ok(state.railBottom>state.micBottom&&state.railBottom<=state.height-8,'audio-action labels clipped '+label+': '+JSON.stringify(state));
  assert.equal(state.mobileNav,false,'unexpected mobile dock in desktop window');
  const png=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  if(typeof png.data!=='string')throw Error('Missing Electron screenshot');
  await writeFile(path.join(resultDir,label+'.png'),Buffer.from(png.data,'base64'));
};
try{
  // Standalone X11 WM handles maximize/minimize state in actual windows.
  wm=spawn('openbox',['--sm-disable'],{stdio:'ignore'});
  await delay(800);
  electron=spawn(path.resolve('node_modules/.bin/electron'),[
    '.', '--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
    '--force-device-scale-factor='+scale,
    '--remote-debugging-port='+port
  ],{
    cwd:path.resolve('.'),
    env:{...process.env,ELECTRON_DISABLE_SECURITY_WARNINGS:'false'},
    stdio:['ignore','ignore','pipe']
  });
  electron.stderr?.on('data',(chunk:Buffer)=>{stderr=(stderr+String(chunk)).slice(-8000);});
  let wsUrl;
  for(let attempt=0;attempt<200;attempt++){
    if(electron.exitCode!==null)throw Error('Electron process exited '+electron.exitCode+': '+stderr);
    try{
      const response=await fetch('http://127.0.0.1:'+port+'/json/list');
      if(response.ok){
        const pages=await response.json() as Array<{type:string;url:string;webSocketDebuggerUrl:string}>;
        const page=pages.find(p=>p.type==='page'&&(p.url||'').startsWith('voxnelo://app/'));
        if(page){wsUrl=page.webSocketDebuggerUrl;break;}
      }
    }catch{/* Waiting for the Electron debug endpoint. */}
    await delay(150);
  }
  if(!wsUrl)throw Error('Electron page not found on CDP: '+stderr);
  const activeSocket=new WebSocket(wsUrl);
  socket=activeSocket;
  await new Promise<void>((resolve,reject)=>{
    activeSocket.addEventListener('open',()=>resolve(),{once:true});
    activeSocket.addEventListener('error',()=>reject(Error('Electron WebSocket failed')),{once:true});
  });
  activeSocket.addEventListener('message',e=>{
    const packet=JSON.parse(String(e.data)) as {id?:number;error?:unknown;result?:CdpReply};
    if(packet.id===undefined)return;
    const entry=pending.get(packet.id);
    if(!entry)return;
    clearTimeout(entry.timeout);pending.delete(packet.id);
    if(packet.error)entry.reject(Error(JSON.stringify(packet.error)));
    else entry.resolve(packet.result||{});
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await until('document.readyState==="complete"&&!!document.querySelector(".practiceLayout")&&!!window.voxneloDesktop?.windowControls');
  // Check renderer security surface; the test does not widen the preload API.
  const secure=await evaluate<{node:string;process:string;bridgeKeys:string[]}>('({node:typeof window.require,process:typeof window.process,bridgeKeys:Object.keys(window.voxneloDesktop).sort()})');
  assert.equal(secure.node,'undefined','unsafe Node integration');
  assert.equal(secure.process,'undefined','unsafe process exposed in renderer');
  assert.deepEqual(secure.bridgeKeys,['asr','platform','speech','version','windowControls'],'unexpected preload capability');
  const offline=await evaluate('window.voxneloDesktop.asr.capabilities()');
  assert.deepEqual(offline,{available:false,reason:'not-configured'},'Packaged/default Electron must not implicitly load native ASR or a cloud provider');
  report.push({label:'context-isolation',...secure});

  const winId=xdo('search','--onlyvisible','--name','^Voxnelo$').split('\n')[0];
  if(!winId)throw Error('Electron native top-level window not found via X11');
  await snapshot('1160x760-electron',1160,760);

  if(scale===1) {
  xdo('windowsize',winId,'800','610');
  await until('Math.abs(innerWidth-800)<=25&&Math.abs(innerHeight-610)<=25');
  await snapshot('800x610-electron',800,610);

  xdo('windowsize',winId,'1440','900');
  await until('Math.abs(innerWidth-1440)<=25&&Math.abs(innerHeight-900)<=25');
  await snapshot('1440x900-electron',1440,900);

  // Real frameless maximize/restore through production IPC, not test hooks.
  const initially=await evaluate('window.voxneloDesktop.windowControls.isMaximized()');
  assert.equal(initially,false,'unexpected initial maximize state');
  await evaluate('window.voxneloDesktop.windowControls.toggleMaximize()');
  await until('window.voxneloDesktop.windowControls.isMaximized()');
  await until('!!document.querySelector(".appTitlebar .windowControl.maximize[aria-label]")');
  const maxed=await viewport();
  assert.ok(maxed.width>=1440&&maxed.height>=900,'maximized viewport too small');
  report.push({label:'maximized-electron',...maxed});
  await evaluate('window.voxneloDesktop.windowControls.toggleMaximize()');
  await until('window.voxneloDesktop.windowControls.isMaximized().then(x=>!x)');

  // Minimize and restore through the real native window manager.
  await evaluate('window.voxneloDesktop.windowControls.minimize()');
  await delay(350);
  xdo('windowactivate','--sync',winId);
  await until('!!document.querySelector(".appTitlebar")');

  const reduced=await evaluate<{supported:boolean;style:string}>('(()=>{const media=matchMedia("(prefers-reduced-motion: reduce)");return {supported:typeof media.matches==="boolean",style:getComputedStyle(document.querySelector(".practiceLayout")).animationName}})()');
  report.push({label:'motion-availability',...reduced});
  } else {
    // DPI integration tests use the app's actual native window with a scaled
    // display. Avoid resizing with X11 physical pixels: these do not represent
    // Electron DIP consistently across compositors.
    const scaled=await viewport();
    assert.equal(scaled.mobileNav,false,'Desktop navigation hidden under high DPI');
    report.push({label:'high-dpi-native-window',...scaled});
  }
  await writeFile(path.join(resultDir,'report.json'),JSON.stringify({result:'passed',report},null,2));
  console.log('Native Linux Electron smoke passed:',report.map(r=>r.label).join(', '));
}catch(error){
  await writeFile(path.join(resultDir,'report.json'),JSON.stringify({result:'failed',error:String(error instanceof Error?(error.stack??error.message):error),stderr,report},null,2));
  console.error(error);process.exitCode=1;
}finally{
  if(socket&&socket.readyState===WebSocket.OPEN)socket.close();
  for(const task of pending.values())clearTimeout(task.timeout);
  if(electron&&electron.exitCode===null)electron.kill('SIGTERM');
  if(wm&&wm.exitCode===null)wm.kill('SIGTERM');
}
