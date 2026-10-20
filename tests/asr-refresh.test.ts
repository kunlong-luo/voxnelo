import { describe, expect, it, vi } from 'vitest';
import { RefreshableAsrEngine } from '../apps/desktop/asrRefresh';

type Engine = {
  capabilities:()=>{available:boolean};
  hasActiveSession:()=>boolean;
  id:string;
};
const fake=(id:string,available:boolean,active=false):Engine=>({
  id,capabilities:()=>({available}),hasActiveSession:()=>active,
});

describe('Live-installed personal ASR refresh',()=>{
  it('replaces a missing startup engine after a verified pack is installed',async()=>{
    const old=fake('missing',false), verified=fake('verified',true);
    const loadVerified=vi.fn(async()=>verified);
    const engine=new RefreshableAsrEngine(old,loadVerified);
    expect(engine.current()).toBe(old);
    expect(await engine.refreshIfUnavailable()).toBe(verified);
    expect(await engine.refreshIfUnavailable()).toBe(verified);
    expect(loadVerified).toHaveBeenCalledOnce();
  });

  it('coalesces simultaneous capability/start IPC requests into one validation',async()=>{
    let finish:(engine:Engine)=>void=()=>{throw Error('loader was not pending');};
    const waiting=new Promise<Engine>(resolve=>{finish=resolve;});
    const loadVerified=vi.fn(()=>waiting);
    const engine=new RefreshableAsrEngine(fake('missing',false),loadVerified);
    const checks=[engine.refreshIfUnavailable(),engine.refreshIfUnavailable()];
    expect(loadVerified).toHaveBeenCalledOnce();
    finish(fake('verified',true));
    const [a,b]=await Promise.all(checks);
    expect(a).toBe(b);
    expect(a.capabilities().available).toBe(true);
  });

  it('never swaps a running native worker during a model refresh',async()=>{
    let active=false;
    const first:Engine={id:'in-use',capabilities:()=>({available:false}),hasActiveSession:()=>active};
    let finish:(engine:Engine)=>void=()=>{throw Error('loader was not pending');};
    const waiting=new Promise<Engine>(resolve=>{finish=resolve;});
    const loadVerified=vi.fn(()=>waiting);
    const engine=new RefreshableAsrEngine(first,loadVerified);
    const checking=engine.refreshIfUnavailable();
    active=true;
    finish(fake('new',true));
    expect(await checking).toBe(first);
    expect(await engine.refreshIfUnavailable()).toBe(first);
    expect(loadVerified).toHaveBeenCalledOnce();
  });

  it('does not cache a failed verification as success and permits a retry',async()=>{
    const ready=fake('verified',true);
    const loadVerified=vi.fn().mockRejectedValueOnce(Error('verification failed'))
      .mockResolvedValueOnce(ready);
    const engine=new RefreshableAsrEngine(fake('unavailable',false),loadVerified);
    await expect(engine.refreshIfUnavailable()).rejects.toThrow('verification failed');
    expect(engine.current().capabilities().available).toBe(false);
    expect(await engine.refreshIfUnavailable()).toBe(ready);
    expect(loadVerified).toHaveBeenCalledTimes(2);
  });
});
