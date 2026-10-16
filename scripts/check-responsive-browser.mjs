#!/usr/bin/env node
// Browser geometry and screenshot smoke; Node 22 WebSocket + Chromium, no deps.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const out = path.resolve('browser-layout'), root=path.resolve('dist');
const sizes = [[320,640],[390,844],[640,720],[800,610],[1160,760],[1440,900]];
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.woff2':'font/woff2'};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const bins=[process.env.CHROME_BIN,'google-chrome','google-chrome-stable','chromium','chromium-browser'].filter(Boolean);
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
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port+'/index.html';
const profile=await mkdtemp(path.join(tmpdir(),'voxnelo-cdp-'));
let chrome, ws, seq=0, chromeOutput="";const pending=new Map(), report=[];
const send=(method,params={})=>new Promise((resolve,reject)=>{
  const id=++seq, timeout=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method));},12000);
  pending.set(id,{resolve,reject,timeout});ws.send(JSON.stringify({id,method,params}));
});
const evalJs=async expression=>{
  const x=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(x.exceptionDetails)throw Error('CDP expression failed: '+x.exceptionDetails.text);
  return x.result?.value;
};
const until=async expression=>{
  for(let i=0;i<70;i++){try{if(await evalJs(expression))return;}catch { /* React may not have committed the next view. */ } await sleep(100);}
  throw Error('Condition never met: '+expression);
};
const activate=async(index,klass)=>{
  await evalJs('(()=>{const nav=document.querySelector(innerWidth<640?".mobileNav":".sidebar nav");nav.querySelectorAll("button")['+index+'].click()})()');
  await until('!!document.querySelector("'+klass+'")');
};
const metrics=async()=>{
  return await evalJs('(()=>{const d=document.documentElement,m=document.querySelector(".mainArea"),g=document.querySelector(".practiceLayout"),b=document.querySelector(".recordAction"),r=b?.getBoundingClientRect();return {scrollWidth:d.scrollWidth,clientWidth:d.clientWidth,mainWidth:Math.round(m.getBoundingClientRect().width),containerName:getComputedStyle(m).containerName,columns:g?getComputedStyle(g).gridTemplateColumns.split(" ").length:null,sidebar:getComputedStyle(document.querySelector(".sidebar")).display!=="none",dock:getComputedStyle(document.querySelector(".mobileNav")).display!=="none",micWidth:Math.round(r?.width||0),micInBounds:!r||(r.left>=-1&&r.right<=innerWidth+1),micTop:Math.round(r?.top||0),micBottom:Math.round(r?.bottom||0),micInFirstViewport:!r||(r.top>=0&&r.bottom<=(innerWidth<640?document.querySelector(".mobileNav").getBoundingClientRect().top:innerHeight))}})()');
};
const shot=async(w,h,name)=>{
  await sleep(460); // Capture settled UI, not a half-transparent entrance frame.
  const m=await metrics();
  report.push({size:[w,h],page:name,...m});
  assert.ok(m.scrollWidth<=m.clientWidth+1,'horizontal overflow '+w+'x'+h+' '+name+': '+JSON.stringify(m));
  assert.ok(m.containerName.includes('workspace'),'named container query not applied');
  assert.equal(m.dock,w<640,'wrong bottom nav visibility at '+w);
  assert.equal(m.sidebar,w>=640,'wrong sidebar visibility at '+w);
  if(name==='practice'){
    assert.equal(m.columns,m.mainWidth>=840?2:1,'wrong workbench columns at '+w);
    assert.ok(m.micWidth>=40&&m.micInBounds&&m.micInFirstViewport,'mic not visible on first screen at '+w+': '+JSON.stringify(m));
  }
  const png=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  await writeFile(path.join(out,w+'x'+h+'-'+name+'.png'),Buffer.from(png.data,'base64'));
};
try{
  chrome=spawn(chromeBin,['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage',
    '--no-first-run','--remote-allow-origins=*','--remote-debugging-port=0','--user-data-dir='+profile,'--window-size=1440,900',url],{stdio:['ignore','ignore','pipe']});
  chrome.stderr.on('data',chunk=>{ chromeOutput=(chromeOutput+String(chunk)).slice(-6000); });
  let port=0;
  for(let i=0;i<300;i++){try{const s=await readFile(path.join(profile,'DevToolsActivePort'),'utf8');port=Number(s.split('\n')[0]);if(port)break;}catch { /* Chrome is starting. */ } if(chrome.exitCode!==null)break; await sleep(100);}
  if(!port)throw Error('Chrome debugging did not start (exit='+chrome.exitCode+'): '+chromeOutput);
  const targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  const target=targets.find(t=>t.type==='page');
  if(!target)throw Error('No Chrome page');
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
  ws.addEventListener('message',event=>{const p=JSON.parse(event.data),q=pending.get(p.id);if(!q)return;clearTimeout(q.timeout);pending.delete(p.id);if(p.error)q.reject(Error(JSON.stringify(p.error)));else q.resolve(p.result||{});});
  await send('Page.enable');await send('Runtime.enable');
  await until('!!document.querySelector(".practiceLayout")');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  const normalMotion=await evalJs('getComputedStyle(document.querySelector(".practiceLayout")).animationName');
  assert.ok(normalMotion.includes('view-enter'),'entrance motion token not compiled: '+normalMotion);
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  const reducedMotion=await evalJs('(()=>{const el=document.querySelector(".practiceLayout");const s=getComputedStyle(el);return {enabled:matchMedia("(prefers-reduced-motion: reduce)").matches,name:s.animationName,duration:s.animationDuration}})()');
  assert.ok(reducedMotion.enabled&&(!reducedMotion.name.includes('view-enter')||parseFloat(reducedMotion.duration)<=.001),'reduced-motion fails: '+JSON.stringify(reducedMotion));
  report.push({page:'reduced-motion',...reducedMotion});
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  // Capture real Chinese typography rather than relying on runner's locale.
  await activate(4,'.settingsPage');
  await evalJs('document.querySelectorAll(".languageChoices button")[1].click()');
  await until('document.documentElement.lang.toLowerCase().startsWith("zh")');
  await activate(0,'.practiceLayout');
  for(const [w,h] of sizes){
    await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:false});
    await sleep(150);
    await shot(w,h,'practice');
    await activate(4,'.settingsPage');await shot(w,h,'settings');
    await activate(1,'.libraryPage');await shot(w,h,'library');
    await activate(0,'.practiceLayout');
  }
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
  const s=await evalJs('(()=>{const a=document.querySelector(".recordingQuickStop").getBoundingClientRect(),b=document.querySelector(".mobileNav").getBoundingClientRect();return{top:a.top,bottom:a.bottom,right:a.right,dockTop:b.top}})()');
  assert.ok(s.top>=0&&s.right<=321&&s.bottom<=s.dockTop,'recording stop hidden behind mobile nav '+JSON.stringify(s));
  await evalJs('document.querySelector(".recordingQuickStop").click()');
  await until('!document.querySelector(".recordingQuickStop")');
  report.push({size:[320,640],page:'recording stop',...s});
  await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
  console.log('Browser responsive check passed: '+report.length+' samples with screenshots.');
  console.log('Responsive geometry:',JSON.stringify(report));
}catch(err){
  await writeFile(path.join(out,'report.json'),JSON.stringify({error:String(err.stack||err),report},null,2));
  console.error(err);process.exitCode=1;
}finally{
  if(ws&&ws.readyState===WebSocket.OPEN)ws.close();
  if(chrome){
    if(chrome.exitCode===null){
      chrome.kill('SIGTERM');
      await new Promise(resolve=>{
        chrome.once('exit',resolve);
        setTimeout(resolve,3000).unref();
      });
    }
  }
  await new Promise(resolve=>server.close(resolve));
  // Chrome can briefly recreate files while shutting down. On ephemeral CI
  // machines, a cleanup race must not turn a passing visual check red.
  await rm(profile,{recursive:true,force:true,maxRetries:6,retryDelay:250})
    .catch(error=>console.warn('Browser profile cleanup skipped:',error.message));
}
