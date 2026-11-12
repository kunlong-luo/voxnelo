/**
 * Small, dependency-free replacement for wait-on's localhost HTTP gate.
 * Only accepts the app's local Rsbuild development server; never polls
 * arbitrary remote endpoints or forwards credentials.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as pause} from 'node:timers/promises';

export interface ReadinessDependencies {
  now?:()=>number;
  sleep?:(ms:number)=>Promise<void>;
  probe?:(url:URL)=>Promise<boolean>;
}

export function parseLocalDevUrl(value:string):URL{
  const url=new URL(value);
  assert.equal(url.protocol,'http:','Dev server must use HTTP');
  assert.ok(url.hostname==='127.0.0.1'||url.hostname==='localhost'||url.hostname==='[::1]',
    'Dev server must be a loopback address');
  assert.ok(!url.username&&!url.password&&!url.hash,'Dev server must not contain credentials or a fragment');
  assert.equal(url.port,'3000','Dev server must use the configured Rsbuild port');
  return url;
}

async function probeHttp(url:URL):Promise<boolean>{
  const response=await fetch(url,{
    redirect:'manual',
    signal:AbortSignal.timeout(2000),
  });
  await response.body?.cancel();
  return response.status>=200&&response.status<300;
}

/** Keep localhost polling bounded, including on connection-refused or 503. */
export async function waitForLocalDevServer(
  address:string,
  dependencies:ReadinessDependencies={},
  timeoutMs=120_000,
):Promise<void>{
  const url=parseLocalDevUrl(address);
  assert.ok(Number.isSafeInteger(timeoutMs)&&timeoutMs>0,'Invalid dev-server timeout');
  const now=dependencies.now??Date.now;
  const sleep=dependencies.sleep??((ms:number)=>pause(ms));
  const probe=dependencies.probe??probeHttp;
  const start=now();
  while(now()-start<timeoutMs){
    try{
      if(await probe(url))return;
    }catch{
      // Expected while Rsbuild is still starting. Keep console logs private.
    }
    await sleep(250);
  }
  throw Error('Voxnelo development server did not become ready at '+url.origin);
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const address=process.argv[2]??'http://127.0.0.1:3000';
  console.log('Waiting for Voxnelo local development renderer...');
  waitForLocalDevServer(address).then(
    ()=>console.log('Voxnelo local development renderer is ready.'),
    error=>{console.error(error instanceof Error?error.message:'Dev server is unavailable');process.exitCode=1},
  );
}
