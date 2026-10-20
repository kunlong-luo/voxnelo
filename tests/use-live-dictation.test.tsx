// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLiveDictation } from '../apps/web/src/useLiveDictation';

class FakeRecognizer {
  static instances: FakeRecognizer[]=[];
  static available=vi.fn(async()=> 'available');
  static install=vi.fn(async()=> true);
  lang=''; continuous=false; interimResults=false; processLocally=false;
  onresult: ((event:{resultIndex:number;results:ArrayLike<{isFinal:boolean;0?:{transcript:string}}>} )=>void)|null=null;
  onerror: ((event:{error:string})=>void)|null=null;
  onend: (()=>void)|null=null;
  onstart: (()=>void)|null=null;
  start=vi.fn(()=>{
    this.onstart?.();
  });
  stop=vi.fn(()=>this.onend?.());
  abort=vi.fn();
  constructor(){FakeRecognizer.instances.push(this);}
}
let latest:ReturnType<typeof useLiveDictation>;
function Harness({sentence='one'}:{sentence?:string}){
  latest=useLiveDictation(sentence);
  return <div data-testid="status">{latest.status}</div>;
}
beforeEach(()=>{
  FakeRecognizer.instances=[];
  FakeRecognizer.available.mockReset().mockResolvedValue('available');
  FakeRecognizer.install.mockReset().mockResolvedValue(true);
  vi.stubGlobal('SpeechRecognition',FakeRecognizer);
  vi.stubGlobal('voxneloDesktop',undefined);
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();});
describe('Local-first live dictation',()=>{
  it('uses actual interim/final ASR events, not simulated transcripts',async()=>{
    render(<Harness/>);
    expect(latest.status).toBe('idle');
    await act(async()=>{await latest.start()});
    const engine=FakeRecognizer.instances[0];
    if(!engine)throw Error('No recognizer created');
    expect(engine.lang).toBe('en-US');
    expect(engine.continuous).toBe(true);
    expect(engine.interimResults).toBe(true);
    expect(engine.processLocally).toBe(true);
    expect(FakeRecognizer.available).toHaveBeenCalledWith({langs:['en-US'],processLocally:true});
    expect(latest.status).toBe('listening');
    expect(latest.finalText).toBe('');
    act(()=>engine.onresult?.({resultIndex:0,results:[
      {isFinal:true,0:{transcript:'How are'}},
      {isFinal:false,0:{transcript:'you today'}}
    ]}));
    expect(latest.finalText).toBe('How are');
    expect(latest.interimText).toBe('you today');
    act(()=>engine.onresult?.({resultIndex:1,results:[
      {isFinal:true,0:{transcript:'How are'}},
      {isFinal:true,0:{transcript:'you today'}}
    ]}));
    expect(latest.finalText).toBe('How are you today');
    expect(latest.interimText).toBe('');
    act(()=>latest.stop());
    expect(engine.stop).toHaveBeenCalled();
    expect(latest.status).toBe('idle');
    expect(latest.finalText).toBe('How are you today');
  });
  it('fails closed when on-device ASR is missing, without implicit cloud fallback',async()=>{
    FakeRecognizer.available.mockResolvedValue('unavailable');
    render(<Harness/>);
    await act(async()=>{await latest.start()});
    expect(FakeRecognizer.instances).toHaveLength(0);
    expect(latest.status).toBe('idle');
    expect(latest.error).toContain('本地英语识别');
    expect(latest.mode).toBe('local');
  });
  it('does not install language packs without a direct user interaction',async()=>{
    FakeRecognizer.available.mockResolvedValue('downloadable');
    render(<Harness/>);
    await act(async()=>{await latest.start()});
    expect(latest.localPack).toBe('downloadable');
    expect(FakeRecognizer.install).not.toHaveBeenCalled();
    await act(async()=>{await latest.installLocal()});
    expect(FakeRecognizer.install).toHaveBeenCalledWith({langs:['en-US'],processLocally:true});
    expect(latest.localPack).toBe('available');
  });
  it('allows remote browser recognition only after explicit selection, never in Electron',async()=>{
    FakeRecognizer.available.mockResolvedValue('unavailable');
    const {rerender}=render(<Harness/>);
    const localProbes=FakeRecognizer.available.mock.calls.length;
    act(()=>latest.chooseMode('browser'));
    await act(async()=>{await latest.start()});
    const engine=FakeRecognizer.instances[0];
    expect(engine?.processLocally).toBe(false);
    expect(FakeRecognizer.available).toHaveBeenCalledTimes(localProbes);
    act(()=>latest.stop());
    vi.stubGlobal('voxneloDesktop',{platform:'linux',version:'0.1',windowControls:{}});
    rerender(<Harness sentence="two"/>);
    act(()=>latest.chooseMode('browser'));
    expect(latest.mode).toBe('browser'); // existing selection is not changed automatically; start still denies it
    await act(async()=>{await latest.start()});
    expect(latest.error).toContain('本地英语识别');
    expect(FakeRecognizer.instances).toHaveLength(1);
  });
  it('Electron never probes unsupported Chromium ASR when native ONNX assets are absent',async()=>{
    const capabilities=vi.fn(async()=>({available:false,reason:'missing-addon'}));
    vi.stubGlobal('voxneloDesktop',{platform:'linux',asr:{capabilities}});
    render(<Harness/>);
    await act(async()=>{await Promise.resolve()});
    expect(latest.supported).toBe(false);
    expect(latest.desktopReason).toBe('missing-addon');
    await act(async()=>{await latest.start()});
    expect(FakeRecognizer.available).not.toHaveBeenCalled();
    expect(FakeRecognizer.instances).toHaveLength(0);
    expect(latest.status).toBe('idle');
    expect(latest.error).toContain('本地英语识别');
    await act(async()=>{await latest.installLocal()});
    expect(FakeRecognizer.install).not.toHaveBeenCalled();
  });
  it('desktop never falls back to cloud recognition when on-device pack is absent',async()=>{
    FakeRecognizer.available.mockResolvedValue('unavailable');
    vi.stubGlobal('voxneloDesktop',{platform:'linux',asr:{capabilities:vi.fn(async()=>({available:false,reason:'not-configured'}))}});
    render(<Harness/>);
    await act(async()=>{await Promise.resolve();await latest.start()});
    expect(FakeRecognizer.instances).toHaveLength(0);
    expect(latest.status).toBe('idle');
    expect(latest.mode).toBe('local');
  });
  it('clears live recognition on sentence change and ignores stale results',async()=>{
    const {rerender}=render(<Harness sentence="one"/>);
    await act(async()=>{await latest.start()});
    const old=FakeRecognizer.instances[0];
    if(!old)throw Error('missing');
    const handler=old.onresult;
    rerender(<Harness sentence="two"/>);
    expect(latest.status).toBe('idle');
    act(()=>handler?.({resultIndex:0,results:[{isFinal:true,0:{transcript:'stale'}}]}));
    expect(latest.finalText).toBe('');
  });
});
