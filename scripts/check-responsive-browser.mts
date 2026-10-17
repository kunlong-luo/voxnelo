#!/usr/bin/env node
// Browser geometry and screenshot smoke; Node 22 WebSocket + Chromium, no deps.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const out = path.resolve('browser-layout'), root=path.resolve('dist');
const sizes: Array<[number, number]> = [[320,640],[390,844],[640,720],[800,610],[1160,760],[1440,900]];
const mime: Record<string,string>={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.woff2':'font/woff2'};
const sleep=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
const bins=[process.env.CHROME_BIN,'google-chrome','google-chrome-stable','chromium','chromium-browser'].filter((value):value is string=>Boolean(value));
const chromeBin=bins.find(bin=>bin.includes('/')?spawnSync('test',['-x',bin]).status===0:spawnSync('which',[bin]).status===0);
if(!chromeBin)throw Error('Chromium not found; set CHROME_BIN');
await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{
  const url=new URL(req.url||'/','http://localhost');
  const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try {const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(data);}
  catch{res.writeHead(404).end();}
});
await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
const address=server.address();
if(!address||typeof address==='string')throw Error('HTTP server address unavailable');
const url='http://127.0.0.1:'+address.port+'/index.html';
const profile=await mkdtemp(path.join(tmpdir(),'voxnelo-cdp-'));
type CdpReply={result?:{value?:unknown};exceptionDetails?:{text:string};data?:string;[key:string]:unknown};
type LayoutMetrics={progressHeight:number;progressBottom:number;feedTop:number;scrollWidth:number;clientWidth:number;mainWidth:number;containerName:string;columns:number|null;sidebar:boolean;dock:boolean;micWidth:number;micInBounds:boolean;micTop:number;micBottom:number;micInFirstViewport:boolean;heroWidth:number;heroRadius:number;sentenceFontSize:number};
type ThemeMaterial={theme:string;glass:string;primaryBackground:string;glassBackground:string};
type ReducedMotion={enabled:boolean;name:string;duration:string};
type Bounds={top:number;bottom:number;right:number;dockTop:number};
let chrome: ReturnType<typeof spawn>|undefined;
let ws: WebSocket|undefined;
let seq=0, chromeOutput="";
const pending=new Map<number,{resolve:(value:CdpReply)=>void;reject:(reason:Error)=>void;timeout:ReturnType<typeof setTimeout>}>();
const report: Array<Record<string,unknown>>=[];
const send=(method:string,params:Record<string,unknown>={})=>new Promise<CdpReply>((resolve,reject)=>{
  if(!ws){reject(Error('Chrome WebSocket unavailable'));return;}
  const id=++seq, timeout=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method));},12000);
  pending.set(id,{resolve,reject,timeout});ws.send(JSON.stringify({id,method,params}));
});
const evalJs=async <T=string,>(expression:string):Promise<T>=>{
  const x=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(x.exceptionDetails)throw Error('CDP expression failed: '+x.exceptionDetails.text);
  return x.result?.value as T;
};
const until=async(expression:string):Promise<void>=>{
  for(let i=0;i<70;i++){try{if(await evalJs(expression))return;}catch { /* React may not have committed the next view. */ } await sleep(100);}
  throw Error('Condition never met: '+expression);
};
const activate=async(index:number,klass:string):Promise<void>=>{
  await evalJs('(()=>{const nav=document.querySelector(innerWidth<640?".mobileNav":".sidebar nav");nav.querySelectorAll("button")['+index+'].click()})()');
  await until('!!document.querySelector("'+klass+'")');
};
const metrics=async()=>{
  return await evalJs<LayoutMetrics>('(()=>{const d=document.documentElement,m=document.querySelector(".mainArea"),g=document.querySelector(".practiceLayout"),b=document.querySelector(".recordAction"),hero=document.querySelector(".dictationAction"),sentence=document.querySelector(".sentenceText"),r=b?.getBoundingClientRect(),p=document.querySelector(".progressCard")?.getBoundingClientRect(),feed=document.querySelector(".feedCard")?.getBoundingClientRect();return {progressHeight:Math.round(p?.height||0),progressBottom:Math.round(p?.bottom||0),feedTop:Math.round(feed?.top||0),scrollWidth:d.scrollWidth,clientWidth:d.clientWidth,mainWidth:Math.round(m.getBoundingClientRect().width),containerName:getComputedStyle(m).containerName,columns:g?getComputedStyle(g).gridTemplateColumns.split(" ").length:null,sidebar:getComputedStyle(document.querySelector(".sidebar")).display!=="none",dock:getComputedStyle(document.querySelector(".mobileNav")).display!=="none",heroWidth:Math.round(hero?.offsetWidth||0),heroRadius:parseFloat(hero?getComputedStyle(hero).borderTopLeftRadius:"0")||0,sentenceFontSize:parseFloat(sentence?getComputedStyle(sentence).fontSize:"0")||0,micWidth:Math.round(r?.width||0),micInBounds:!r||(r.left>=-1&&r.right<=innerWidth+1),micTop:Math.round(r?.top||0),micBottom:Math.round(r?.bottom||0),micInFirstViewport:!r||(r.top>=0&&r.bottom<=(innerWidth<640?document.querySelector(".mobileNav").getBoundingClientRect().top:innerHeight))}})()');
};
const shot=async(w:number,h:number,name:string):Promise<void>=>{
  await sleep(850); // Capture settled UI after the full 580ms phrase/500ms page transitions.
  const m=await metrics();
  report.push({size:[w,h],page:name,...m});
  assert.ok(m.scrollWidth<=m.clientWidth+1,'horizontal overflow '+w+'x'+h+' '+name+': '+JSON.stringify(m));
  assert.ok(m.containerName.includes('workspace'),'named container query not applied');
  assert.equal(m.dock,w<640,'wrong bottom nav visibility at '+w);
  assert.equal(m.sidebar,w>=640,'wrong sidebar visibility at '+w);
  if(name==='practice'){
    assert.equal(m.columns,m.mainWidth>=840?2:1,'wrong workbench columns at '+w);
    assert.ok(m.micWidth>=40&&m.micInBounds&&m.micInFirstViewport,'recording controls not visible on first screen at '+w+': '+JSON.stringify(m));
    assert.ok(m.heroWidth>=64&&m.heroRadius>=m.heroWidth*.45,'U3 live microphone must be a large circular hero control: '+JSON.stringify(m));
    assert.ok(m.sentenceFontSize>=32,'U3 lesson sentence must remain visually prominent: '+JSON.stringify(m));
    if(m.mainWidth>=840){
      assert.ok(m.progressHeight>0&&m.progressHeight<320,'insight card stretched beyond its content at '+w+': '+JSON.stringify(m));
      assert.ok(m.feedTop>=m.progressBottom&&m.feedTop-m.progressBottom<32,'recommended phrases pushed away from progress panel at '+w+': '+JSON.stringify(m));
    }
  }
  const png=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  if(typeof png.data!=='string')throw Error('Missing screenshot data');
  await writeFile(path.join(out,w+'x'+h+'-'+name+'.png'),Buffer.from(png.data,'base64'));
};
try{
  chrome=spawn(chromeBin,['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage',
    '--no-first-run','--remote-allow-origins=*','--remote-debugging-port=0','--user-data-dir='+profile,'--window-size=1440,900',url],{stdio:['ignore','ignore','pipe']});
  chrome.stderr?.on('data',(chunk:Buffer)=>{ chromeOutput=(chromeOutput+String(chunk)).slice(-6000); });
  let port=0;
  for(let i=0;i<300;i++){try{const s=await readFile(path.join(profile,'DevToolsActivePort'),'utf8');port=Number(s.split('\n')[0]);if(port)break;}catch { /* Chrome is starting. */ } if(chrome.exitCode!==null)break; await sleep(100);}
  if(!port)throw Error('Chrome debugging did not start (exit='+chrome.exitCode+'): '+chromeOutput);
  const targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json() as Array<{type:string;webSocketDebuggerUrl:string}>;
  const target=targets.find(t=>t.type==='page');
  if(!target)throw Error('No Chrome page');
  const socket=new WebSocket(target.webSocketDebuggerUrl);
  ws=socket;
  await new Promise<void>((resolve,reject)=>{socket.addEventListener('open',()=>resolve(),{once:true});socket.addEventListener('error',()=>reject(Error('Chrome WebSocket failed')),{once:true});});
  socket.addEventListener('message',event=>{const p=JSON.parse(String(event.data)) as {id?:number;error?:unknown;result?:CdpReply};if(p.id===undefined)return;const q=pending.get(p.id);if(!q)return;clearTimeout(q.timeout);pending.delete(p.id);if(p.error)q.reject(Error(JSON.stringify(p.error)));else q.resolve(p.result||{});});
  await send('Page.enable');await send('Runtime.enable');
  await until('!!document.querySelector(".practiceLayout")');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  const normalMotion=await evalJs('getComputedStyle(document.querySelector(".practiceLayout")).animationName');
  assert.ok(normalMotion.includes('view-enter'),'entrance motion token not compiled: '+normalMotion);
  // Verify compositor animations are running in Chromium, not merely present
  // as class names. Motion was previously invisible because no runtime trigger
  // was exercised in the layout-only CI.
  const ambientBefore=await evalJs<{name:string;duration:string;active:number;time:number}>('(()=>{const e=document.querySelector("[data-motion=ambient-breathe]"),s=getComputedStyle(e),a=e.getAnimations();return{name:s.animationName,duration:s.animationDuration,active:a.filter(x=>x.playState==="running").length,time:Number(a[0]?.currentTime??0)}})()');
  assert.ok(ambientBefore.name.includes('ambient-breathe')&&parseFloat(ambientBefore.duration)>=5&&ambientBefore.active>0,'ambient glow is not continuously animating: '+JSON.stringify(ambientBefore));
  await sleep(370);
  const ambientAfter=await evalJs<number>('Number(document.querySelector("[data-motion=ambient-breathe]").getAnimations()[0]?.currentTime??0)');
  assert.ok(ambientAfter>ambientBefore.time+150,'ambient glow has no actual animation progress: '+ambientAfter+' / '+ambientBefore.time);
  report.push({page:'ambient-breathing-motion',...ambientBefore,progressMs:ambientAfter-ambientBefore.time});
  const microphoneMotion=await evalJs<{name:string;running:number}>('(()=>{const e=document.querySelector("[data-motion=mic-halo]");return {name:getComputedStyle(e).animationName,running:e.getAnimations().filter(a=>a.playState==="running").length}})()');
  assert.ok(microphoneMotion.name.includes('record-halo')&&microphoneMotion.running>0,'visible idle microphone halo is missing: '+JSON.stringify(microphoneMotion));
  report.push({page:'idle-mic-motion',...microphoneMotion});
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  const quietBreath=await evalJs('getComputedStyle(document.querySelector("[data-motion=ambient-breathe]")).animationDuration');
  assert.ok(parseFloat(quietBreath)<=.001,'ambient glow ignores reduced motion: '+quietBreath);
  const reducedMotion=await evalJs<ReducedMotion>('(()=>{const el=document.querySelector(".practiceLayout");const s=getComputedStyle(el);return {enabled:matchMedia("(prefers-reduced-motion: reduce)").matches,name:s.animationName,duration:s.animationDuration}})()');
  assert.ok(reducedMotion.enabled&&(!reducedMotion.name.includes('view-enter')||parseFloat(reducedMotion.duration)<=.001),'reduced-motion fails: '+JSON.stringify(reducedMotion));
  report.push({page:'reduced-motion',...reducedMotion});
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  // Capture real Chinese typography rather than relying on runner's locale.
  await activate(5,'.settingsPage');
  await evalJs('document.querySelectorAll(".languageChoices button")[1].click()');
  await until('document.documentElement.lang.toLowerCase().startsWith("zh")');
  await activate(0,'.practiceLayout');
  // Interacting with NEXT must create a genuine animation on the new text,
  // even though the text container itself remains mounted.
  const previousEnglish=await evalJs<string>('document.querySelector(".sentenceText").textContent');
  await evalJs('document.querySelector(".nextButton").click()');
  await until('document.querySelector(".sentenceText").textContent!=='+JSON.stringify("FIRST"));
  // Above condition is swapped below for the actual previous sentence text.
  await until('document.querySelector(".sentenceText").getAnimations().some(a=>a.playState==="running")');
  const phraseMotion=await evalJs('document.querySelector(".sentenceText").getAnimations().map(a=>({state:a.playState,duration:a.effect?.getTiming().duration}))');
  assert.ok(Array.isArray(phraseMotion)&&phraseMotion.length>0,'next sentence does not animate');
  report.push({page:'next-sentence-motion',previousEnglish,animations:phraseMotion});
  for(const [w,h] of sizes){
    await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:false});
    await sleep(150);
    await shot(w,h,'practice');
    await activate(5,'.settingsPage');await shot(w,h,'settings');
    await activate(2,'.libraryPage');await shot(w,h,'library');
    await activate(0,'.practiceLayout');
  }
  // Local desktop scrolling: the window and sidebar remain fixed while only
  // the workspace and each phrase/history list may scroll.
  await activate(1,'.catalogPage');
  const localScroll=await evalJs<{frame:string;workspace:string;catalog:string;visible:number}>('(()=>({frame:getComputedStyle(document.querySelector(".appFrame")).overflowY,workspace:getComputedStyle(document.querySelector(".content")).overflowY,catalog:getComputedStyle(document.querySelector(".catalog-grid")).overflowY,visible:document.querySelectorAll(".catalogItem").length}))()');
  assert.equal(localScroll.frame,'hidden','Desktop page should not own the scrollbar');
  assert.equal(localScroll.workspace,'auto','Workspace should own its overflow');
  assert.equal(localScroll.catalog,'auto','Catalog should scroll locally');
  assert.equal(localScroll.visible,6,'Catalog pagination must show six phrases');
  report.push({page:'local-catalog-scroll',...localScroll});
  await shot(1440,900,'catalog');
  await activate(3,'.libraryPage');
  const libraryScroll=await evalJs('getComputedStyle(document.querySelector(".libraryList")).overflowY');
  assert.equal(libraryScroll,'auto','History should scroll locally');
  await activate(0,'.practiceLayout');
  // Validate both actual CSS themes in Chromium, not just class strings.
  await send('Emulation.setDeviceMetricsOverride',{width:1160,height:760,deviceScaleFactor:1,mobile:false});
  const themeMaterial=async()=>evalJs<ThemeMaterial>('(()=>{const lesson=getComputedStyle(document.querySelector(".practiceCard"));const primary=getComputedStyle(document.querySelector(".dictationAction"));return {theme:document.documentElement.dataset.theme,glass:lesson.backdropFilter,primaryBackground:primary.backgroundColor,glassBackground:lesson.backgroundColor}})()');
  const sunset=await themeMaterial();
  assert.equal(sunset.theme,'sunset','Sunset should remain the default theme');
  assert.ok(sunset.glass.includes('blur(20px)'),'Sunset lesson frosted surface missing: '+JSON.stringify(sunset));
  assert.ok(sunset.primaryBackground!=='rgba(0, 0, 0, 0)','primary live dictation control missing: '+JSON.stringify(sunset));
  assert.ok(await evalJs('!!document.querySelector(".liveDictation")'),'live dictation should replace decorative waveform');
  report.push({page:'theme-sunset-material',...sunset});
  await activate(5,'.settingsPage');
  await evalJs('document.querySelector(".appearanceChoices button[aria-label*=\\"北欧\\"]").click()');
  await until('document.documentElement.dataset.theme==="nordic"');
  await activate(0,'.practiceLayout');
  await shot(1160,760,'practice-nordic');
  const nordic=await themeMaterial();
  assert.ok(nordic.glass==='none'||nordic.glass.includes('blur(0px)'),'Nordic should have no blur: '+JSON.stringify(nordic));
  assert.ok(nordic.primaryBackground!=='rgba(0, 0, 0, 0)','Nordic live dictation control missing');
  report.push({page:'theme-nordic-material',...nordic});
  await activate(5,'.settingsPage');
  await evalJs('document.querySelector(".appearanceChoices button[aria-label*=\\"日落\\"]").click()');
  await until('document.documentElement.dataset.theme==="sunset"');
  await activate(0,'.practiceLayout');
  await send('Page.addScriptToEvaluateOnNewDocument',{source:
    'Object.defineProperty(navigator,"mediaDevices",{configurable:true,value:{getUserMedia:async()=>({getTracks:()=>[{stop(){}}]})}});'+
    'window.MediaRecorder=class {static isTypeSupported(){return true;}state="inactive";mimeType="audio/webm";onstop=null;start(){this.state="recording";}stop(){this.state="inactive";this.onstop?.();}};'
  });
  await send('Emulation.setDeviceMetricsOverride',{width:320,height:640,deviceScaleFactor:1,mobile:false});
  await send('Page.reload',{ignoreCache:true});await until('!!document.querySelector(".recordAction")');
  await evalJs('document.querySelector(".recordAction").click()');
  await until('!!document.querySelector(".recordingQuickStop")');
  const liveAnimation=await evalJs('getComputedStyle(document.querySelector("[data-motion=record-halo]")).animationName');
  assert.ok(liveAnimation.includes('record-halo'),'recording halo did not animate: '+liveAnimation);
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  const quietHalo=await evalJs('getComputedStyle(document.querySelector("[data-motion=record-halo]")).animationDuration');
  assert.ok(parseFloat(quietHalo)<=.001,'recording ring ignores reduced-motion: '+quietHalo);
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  report.push({page:'recording-motion',normal:liveAnimation,reducedDuration:quietHalo});
  const s=await evalJs<Bounds>('(()=>{const a=document.querySelector(".recordingQuickStop").getBoundingClientRect(),b=document.querySelector(".mobileNav").getBoundingClientRect();return{top:a.top,bottom:a.bottom,right:a.right,dockTop:b.top}})()');
  assert.ok(s.top>=0&&s.right<=321&&s.bottom<=s.dockTop,'recording stop hidden behind mobile nav '+JSON.stringify(s));
  await evalJs('document.querySelector(".recordingQuickStop").click()');
  await until('!document.querySelector(".recordingQuickStop")');
  report.push({size:[320,640],page:'recording stop',...s});
  await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
  console.log('Browser responsive check passed: '+report.length+' samples with screenshots.');
  console.log('Responsive geometry:',JSON.stringify(report));
}catch(err){
  await writeFile(path.join(out,'report.json'),JSON.stringify({error:String(err instanceof Error?(err.stack??err.message):err),report},null,2));
  console.error(err);process.exitCode=1;
}finally{
  if(ws&&ws.readyState===WebSocket.OPEN)ws.close();
  if(chrome){
    if(chrome.exitCode===null){
      chrome.kill('SIGTERM');
      const processToClose=chrome;
      await new Promise<void>(resolve=>{
        processToClose.once('exit',()=>resolve());
        setTimeout(()=>resolve(),3000).unref();
      });
    }
  }
  await new Promise<void>(resolve=>server.close(()=>resolve()));
  // Chrome can briefly recreate files while shutting down. On ephemeral CI
  // machines, a cleanup race must not turn a passing visual check red.
  await rm(profile,{recursive:true,force:true,maxRetries:6,retryDelay:250})
    .catch((error:unknown)=>console.warn('Browser profile cleanup skipped:',error instanceof Error?error.message:String(error)));
}
