// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
