// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SUPPORT_LINKS } from '@voxnelo/learning';
import { useLiveDictation } from '../apps/web/src/useLiveDictation';
import { LiveDictationPanel } from '../apps/web/src/LiveDictationPanel';

let live: ReturnType<typeof useLiveDictation>;
function Harness() {
  live=useLiveDictation('sentence-one');
  return <div>{live.status}</div>;
}
function PanelHarness(){
  live=useLiveDictation('sentence-one');
  return <LiveDictationPanel dictation={live} blocked={false} onStart={()=>{void live.start()}}/>;
}
const mediaDescriptor=Object.getOwnPropertyDescriptor(navigator,'mediaDevices');
afterEach(()=>{
  cleanup();
  vi.unstubAllGlobals();
  if(mediaDescriptor)Object.defineProperty(navigator,'mediaDevices',mediaDescriptor);
  else Reflect.deleteProperty(navigator,'mediaDevices');
});

function setupDesktop(noiseSuppression?:boolean) {
  const handlers=new Map<string,()=>void>();
  const track={
    stop:vi.fn(),
    getSettings:()=>({noiseSuppression}),
    addEventListener:vi.fn((type:string,listener:()=>void)=>{handlers.set(type,listener);}),
    removeEventListener:vi.fn((type:string)=>{handlers.delete(type);}),
  };
  const media={getAudioTracks:()=>[track],getTracks:()=>[track]};
  const getUserMedia=vi.fn(async()=>media);
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia}});
  const bridge={
    capabilities:vi.fn(async()=>({available:true,reason:'ready'})),
    start:vi.fn(async()=>({ok:true,sessionId:'session-1'})),
    push:vi.fn(),
    stop:vi.fn(async()=>({finalText:'hello final'})),
    onResult:vi.fn(()=>()=>undefined),
    onError:vi.fn(()=>()=>undefined),
  };
  vi.stubGlobal('voxneloDesktop',{platform:'linux',asr:bridge});
  const source={connect:vi.fn()};
  const gain={gain:{value:1},connect:vi.fn()};
  const audioContext={
    sampleRate:48000,
    audioWorklet:{addModule:vi.fn(async()=>undefined)},
    createMediaStreamSource:vi.fn(()=>source),
    createGain:vi.fn(()=>gain),
    destination:{},
    resume:vi.fn(async()=>undefined),
    close:vi.fn(async()=>undefined),
  };
  vi.stubGlobal('AudioContext',vi.fn(function(){return audioContext}));
  const port:{onmessage:((event:{data:Float32Array})=>void)|null}={onmessage:null};
  vi.stubGlobal('AudioWorkletNode',vi.fn(function(){return {port,connect:vi.fn()}}));
  return {bridge,track,handlers,getUserMedia,audioContext,port};
}

describe('Offline dictation product guidance',()=>{
  it('shows a working help link instead of developer commands when ASR is unavailable',async()=>{
    vi.stubGlobal('voxneloDesktop',{
      platform:'linux',
      asr:{capabilities:vi.fn(async()=>({available:false,reason:'not-configured'}))},
    });
    render(<PanelHarness/>);
    await waitFor(()=>expect(live.desktopReason).toBe('not-configured'));
    const link=screen.getByRole('link',{name:'查看听写帮助与反馈'});
    expect(link.getAttribute('href')).toBe(SUPPORT_LINKS.guide);
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(document.body.textContent).not.toContain('pnpm');
    expect(document.body.textContent).not.toContain('npm');
    expect(screen.getByRole('button',{name:'开始实时听写'}).hasAttribute('disabled')).toBe(true);
  });
});

describe('Electron real microphone to local ASR lifecycle',()=>{
  it('starts explicit 16kHz PCM capture, verifies device DSP and flushes final text',async()=>{
    const {bridge,track,port,getUserMedia,audioContext}=setupDesktop(true);
    render(<Harness/>);
    await waitFor(()=>expect(live.supported).toBe(true));
    await act(async()=>{await live.start()});
    expect(live.status).toBe('listening');
    // The worklet resamples the device's native 48 kHz stream to 16 kHz.
    expect(audioContext.sampleRate).toBe(48000);
    expect(live.noiseReduction).toBe('enabled');
    expect(getUserMedia).toHaveBeenCalledWith({
      audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1},
      video:false,
    });
    expect(audioContext.audioWorklet.addModule).toHaveBeenCalledTimes(1);
    act(()=>port.onmessage?.({data:new Float32Array(1600)}));
    expect(bridge.push).toHaveBeenCalledWith('session-1',expect.any(Float32Array));
    await act(async()=>{live.stop();await Promise.resolve()});
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(bridge.stop).toHaveBeenCalledWith('session-1');
    expect(live.finalText).toBe('hello final');
    expect(live.status).toBe('idle');
  });
  it('allows cancelling microphone permission while checking without starting a stale ASR session',async()=>{
    const {bridge,track,getUserMedia}=setupDesktop(true);
    let finishPermission:(()=>void)|undefined;
    const permission=new Promise<void>(resolve=>{finishPermission=resolve;});
    getUserMedia.mockImplementationOnce(async()=>{
      await permission;
      return {getAudioTracks:()=>[track],getTracks:()=>[track]};
    });
    const view=render(<PanelHarness/>);
    await waitFor(()=>expect(live.supported).toBe(true));
    const getAction=()=>view.getByRole('button') as HTMLButtonElement;
    act(()=>fireEvent.click(getAction()));
    expect(live.status).toBe('checking');
    expect(getAction().disabled).toBe(false);
    act(()=>fireEvent.click(getAction()));
    expect(live.status).toBe('idle');
    await act(async()=>{
      finishPermission?.();
      await Promise.resolve();
    });
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(bridge.start).not.toHaveBeenCalled();
    expect(live.finalText).toBe('');
  });

  it('stops when the physical microphone disconnects and reports uncertain DSP honestly',async()=>{
    const {handlers,track,bridge}=setupDesktop(undefined);
    render(<Harness/>);
    await waitFor(()=>expect(live.supported).toBe(true));
    await act(async()=>{await live.start()});
    expect(live.noiseReduction).toBe('unverified');
    act(()=>handlers.get('ended')?.());
    expect(live.status).toBe('idle');
    expect(live.error).toContain('麦克风');
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(bridge.stop).toHaveBeenCalledWith('session-1');
  });
});

describe('Desktop session cancellation and resource cleanup',()=>{
  it('handles denied microphone access without starting the native engine',async()=>{
    const {bridge,getUserMedia}=setupDesktop();
    const denied=new Error('permission denied');
    denied.name='NotAllowedError';
    getUserMedia.mockRejectedValueOnce(denied);
    render(<Harness/>);
    await waitFor(()=>expect(live.supported).toBe(true));
    await act(async()=>{await live.start()});
    expect(live.status).toBe('idle');
    expect(live.error).toContain('授权');
    expect(bridge.start).not.toHaveBeenCalled();
  });

  it('stops an ASR worker that resolves after the user cancelled startup',async()=>{
    const {bridge,track}=setupDesktop();
    let finishOpen:((result:{ok:boolean;sessionId:string})=>void)|undefined;
    bridge.start.mockImplementationOnce(()=>new Promise(resolve=>{finishOpen=resolve;}));
    render(<Harness/>);
    await waitFor(()=>expect(live.supported).toBe(true));
    act(()=>{void live.start()});
    await waitFor(()=>expect(bridge.start).toHaveBeenCalledOnce());
    act(()=>live.stop());
    await act(async()=>{
      finishOpen?.({ok:true,sessionId:'late-session'});
      await Promise.resolve();
    });
    expect(bridge.stop).toHaveBeenCalledWith('late-session');
    expect(track.stop).toHaveBeenCalledOnce();
    expect(bridge.onResult).not.toHaveBeenCalled();
    expect(live.status).toBe('idle');
    expect(live.finalText).toBe('');
  });

  it('releases microphone and native session when AudioWorklet setup fails',async()=>{
    const {bridge,track,port,audioContext}=setupDesktop();
    audioContext.audioWorklet.addModule.mockRejectedValueOnce(new Error('worklet unavailable'));
    render(<Harness/>);
    await waitFor(()=>expect(live.supported).toBe(true));
    await act(async()=>{await live.start()});
    expect(track.stop).toHaveBeenCalledOnce();
    expect(bridge.stop).toHaveBeenCalledWith('session-1');
    expect(audioContext.close).toHaveBeenCalledOnce();
    expect(port.onmessage).toBeNull();
    expect(live.status).toBe('idle');
    expect(live.error).toContain('未能启动');
  });

  it('drops queued transcript events and PCM after user stops listening',async()=>{
    const {bridge,port}=setupDesktop(true);
    let queuedResult:((data:{sessionId:string;finalText:string;interimText:string})=>void)|undefined;
    const unsubscribe=vi.fn();
    bridge.onResult.mockImplementationOnce((listener:typeof queuedResult)=>{
      queuedResult=listener;
      return unsubscribe;
    });
    render(<Harness/>);
    await waitFor(()=>expect(live.supported).toBe(true));
    await act(async()=>{await live.start()});
    const queuedPCM=port.onmessage;
    await act(async()=>{live.stop();await Promise.resolve()});
    const pushed=bridge.push.mock.calls.length;
    act(()=>{
      queuedResult?.({sessionId:'session-1',finalText:'late result',interimText:'late'});
      queuedPCM?.({data:new Float32Array(1600)});
    });
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(port.onmessage).toBeNull();
    expect(bridge.push).toHaveBeenCalledTimes(pushed);
    expect(live.finalText).toBe('hello final');
    expect(live.interimText).toBe('');
  });

  it('cleans up the worker and microphone after a native recognition error',async()=>{
    const {bridge,track}=setupDesktop(true);
    let errorHandler:((sessionId:string)=>void)|undefined;
    bridge.onError.mockImplementationOnce((listener:typeof errorHandler)=>{
      errorHandler=listener;
      return vi.fn();
    });
    render(<Harness/>);
    await waitFor(()=>expect(live.supported).toBe(true));
    await act(async()=>{await live.start()});
    act(()=>errorHandler?.('session-1'));
    expect(live.status).toBe('idle');
    expect(live.error).toContain('未能启动');
    expect(track.stop).toHaveBeenCalledOnce();
    expect(bridge.stop).toHaveBeenCalledWith('session-1');
  });
});
