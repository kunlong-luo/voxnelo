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
  const asrErrorHandlers=new Set<(sessionId:string,reason:'overloaded'|'failed')=>void>();
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
    stop:vi.fn(async()=>({finalText:'hello final',completed:true})),
    onResult:vi.fn((_listener:(result:{sessionId:string;finalText:string;interimText:string})=>void)=>()=>undefined),
    onError:vi.fn((listener:(sessionId:string,reason:'overloaded'|'failed')=>void)=>{
      asrErrorHandlers.add(listener);
      return ()=>{asrErrorHandlers.delete(listener);};
    }),
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
  const port:{onmessage:((event:{data:Float32Array|{type:string}})=>void)|null;postMessage?:(message:{type:string})=>void}={onmessage:null};
  vi.stubGlobal('AudioWorkletNode',vi.fn(function(){return {port,connect:vi.fn()}}));
  return {bridge,track,handlers,getUserMedia,audioContext,port,
    emitAsrError:(reason:'overloaded'|'failed')=>{for(const listener of [...asrErrorHandlers])listener('session-1',reason);},
  };
}

describe('Browser dictation availability feedback',()=>{
  it('does not animate a dead web microphone when no recognition API exists',async()=>{
    vi.stubGlobal('voxneloDesktop',undefined);
    vi.stubGlobal('SpeechRecognition',undefined);
    vi.stubGlobal('webkitSpeechRecognition',undefined);
    render(<PanelHarness/>);
    const action=screen.getByRole('button',{name:'开始实时听写'});
    await waitFor(()=>expect(action.hasAttribute('disabled')).toBe(true));
    expect(screen.getByText('当前环境没有可用的实时语音识别接口，录音功能仍可使用。')).toBeTruthy();
    fireEvent.click(action);
    expect(live.status).toBe('idle');
    expect(live.finalText).toBe('');
    expect(live.mode).toBe('local');
  });
});

describe('Browser local-only capability',()=>{
  it('does not present a network-only Web Speech API as offline dictation',async()=>{
    class BrowserOnlineOnly {}
    vi.stubGlobal('voxneloDesktop',undefined);
    vi.stubGlobal('SpeechRecognition',BrowserOnlineOnly);
    render(<PanelHarness/>);
    const action=screen.getByRole('button',{name:'开始实时听写'});
    await waitFor(()=>expect(action.hasAttribute('disabled')).toBe(true));
    expect(live.supported).toBe(false);
    expect(live.mode).toBe('local');
    const choice=screen.getByRole('button',{name:'改用浏览器在线识别（可能上传音频）'});
    fireEvent.click(choice);
    expect(live.mode).toBe('browser');
    expect(action.hasAttribute('disabled')).toBe(false);
    expect(screen.getByText('浏览器在线识别已启用，本次会话的语音可能由浏览器服务处理。')).toBeTruthy();
  });
});

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
    const action=screen.getByRole('button',{name:'开始实时听写'});
    expect(action.hasAttribute('disabled')).toBe(false);
    fireEvent.click(action);
    await waitFor(()=>expect(live.error).toContain('本地'));
  });
});

describe('Native ASR capability refresh',()=>{
  it('starts after a personal model becomes available without remounting the view',async()=>{
    const {bridge}=setupDesktop(true);
    bridge.capabilities.mockResolvedValueOnce({available:false,reason:'missing-model'})
      .mockResolvedValue({available:true,reason:'ready'});
    render(<PanelHarness/>);
    await waitFor(()=>expect(live.desktopReason).toBe('missing-model'));
    expect(live.supported).toBe(false);
    fireEvent.click(screen.getByRole('button',{name:'开始实时听写'}));
    await waitFor(()=>expect(live.status).toBe('listening'));
    expect(bridge.capabilities).toHaveBeenCalledTimes(2);
    expect(bridge.start).toHaveBeenCalledOnce();
    await act(async()=>{live.stop();await Promise.resolve();});
  });
});

describe('Electron real microphone to local ASR lifecycle',()=>{
  it('reports a real Linux native worker startup failure instead of a generic flashing action',async()=>{
    const {bridge,track}=setupDesktop(true);
    bridge.start.mockResolvedValueOnce({ok:false,reason:'failed'} as never);
    render(<Harness/>);
    await waitFor(()=>expect(live.supported).toBe(true));
    await act(async()=>{await live.start();});
    expect(live.status).toBe('idle');
    expect(live.error).toContain('离线识别引擎启动失败');
    expect(track.stop).toHaveBeenCalled();
  });
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
  it('warns after an unsuccessful manual Stop instead of claiming cached incomplete words are final',async()=>{
    const {bridge}=setupDesktop(true);
    bridge.stop.mockResolvedValueOnce({finalText:'the beginning but not the end',completed:false});
    render(<Harness/>);
    await waitFor(()=>expect(live.supported).toBe(true));
    await act(async()=>{await live.start();});
    await act(async()=>{live.stop();await Promise.resolve();});
    expect(bridge.stop).toHaveBeenCalledWith('session-1');
    expect(live.status).toBe('idle');
    expect(live.finalText).toBe('');
    expect(live.error).toContain('听写未能完整结束');
  });

  it('provides actionable overload feedback without inventing a transcript or leaking audio',async()=>{
    const {bridge,track,emitAsrError}=setupDesktop(true);
    // The native close path can return the last *partial* text on failure.
    // It must not be promoted into a completed dictation result.
    bridge.stop.mockResolvedValueOnce({finalText:'incomplete partial recognition',completed:false});
    render(<Harness/>);
    await waitFor(()=>expect(live.supported).toBe(true));
    await act(async()=>{await live.start()});
    expect(live.status).toBe('listening');
    act(()=>emitAsrError('overloaded'));
    expect(live.status).toBe('idle');
    expect(live.error).toContain('设备暂时跟不上实时听写');
    expect(live.finalText).toBe('');
    expect(track.stop).toHaveBeenCalled();
    await waitFor(()=>expect(bridge.stop).toHaveBeenCalledWith('session-1'));
    await act(async()=>{await Promise.resolve();});
    expect(live.finalText).toBe('');
  });

  it('keeps generic worker errors distinct from device-overload messages',async()=>{
    const {emitAsrError}=setupDesktop(true);
    render(<Harness/>);
    await waitFor(()=>expect(live.supported).toBe(true));
    await act(async()=>{await live.start()});
    act(()=>emitAsrError('failed'));
    expect(live.status).toBe('idle');
    expect(live.error).toBe('实时听写未能启动，请重试。');
  });

  it('preserves a final partial PCM packet BEFORE completing native ASR stop',async()=>{
    const {bridge,port,track}=setupDesktop(true);
    const ordering:string[]=[];
    bridge.push.mockImplementation(()=>{ordering.push('pcm');});
    bridge.stop.mockImplementation(async()=>{
      ordering.push('stop');
      return {finalText:'last syllable retained',completed:true};
    });
    port.postMessage=vi.fn((message:{type:string})=>{
      expect(message).toEqual({type:'flush'});
      queueMicrotask(()=>{
        // Simulate a queued normal chunk plus the final 27 ms.
        port.onmessage?.({data:new Float32Array(1600).fill(0.3)});
        port.onmessage?.({data:new Float32Array(432).fill(0.2)});
        port.onmessage?.({data:{type:'flushed'}});
      });
    });
    render(<Harness/>);
    await waitFor(()=>expect(live.supported).toBe(true));
    await act(async()=>{await live.start()});
    act(()=>live.stop());
    expect(track.stop).toHaveBeenCalledOnce();
    await waitFor(()=>expect(bridge.stop).toHaveBeenCalledOnce());
    expect(port.postMessage).toHaveBeenCalledOnce();
    expect(bridge.push).toHaveBeenCalledTimes(2);
    expect((bridge.push.mock.calls[1]?.[1] as Float32Array).length).toBe(432);
    expect(ordering).toEqual(['pcm','pcm','stop']);
    await waitFor(()=>expect(live.finalText).toBe('last syllable retained'));
    expect(port.onmessage).toBeNull();
    // Native close must be one-shot even on duplicate clicks.
    act(()=>live.stop());
    expect(bridge.stop).toHaveBeenCalledOnce();
  });

  it('releases the native session if an old/closed worklet never acknowledges flush',async()=>{
    const {bridge,port,track}=setupDesktop(true);
    port.postMessage=vi.fn(); // mimic OS sleep / detached AudioWorklet
    render(<Harness/>);
    await waitFor(()=>expect(live.supported).toBe(true));
    await act(async()=>{await live.start()});
    vi.useFakeTimers();
    try{
      act(()=>live.stop());
      expect(track.stop).toHaveBeenCalledOnce();
      expect(bridge.stop).not.toHaveBeenCalled();
      await act(async()=>{await vi.advanceTimersByTimeAsync(351)});
      expect(bridge.stop).toHaveBeenCalledWith('session-1');
      expect(port.onmessage).toBeNull();
    }finally{vi.useRealTimers();}
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
    // Wait until native capability refresh has reached the pending
    // microphone permission prompt before exercising cancellation.
    await waitFor(()=>expect(getUserMedia).toHaveBeenCalledOnce());
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
    await waitFor(()=>expect(bridge.stop).toHaveBeenCalledWith('session-1'));
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
    bridge.start.mockImplementationOnce(()=>new Promise<{ok:boolean;sessionId:string}>(resolve=>{finishOpen=resolve;}));
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
    bridge.onResult.mockImplementationOnce((listener:(data:{sessionId:string;finalText:string;interimText:string})=>void)=>{
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
    let errorHandler:((sessionId:string,reason:'overloaded'|'failed')=>void)|undefined;
    bridge.onError.mockImplementationOnce((listener:(sessionId:string,reason:'overloaded'|'failed')=>void)=>{
      errorHandler=listener;
      return vi.fn();
    });
    render(<Harness/>);
    await waitFor(()=>expect(live.supported).toBe(true));
    await act(async()=>{await live.start()});
    act(()=>errorHandler?.('session-1','failed'));
    expect(live.status).toBe('idle');
    expect(live.error).toContain('未能启动');
    expect(track.stop).toHaveBeenCalledOnce();
    await waitFor(()=>expect(bridge.stop).toHaveBeenCalledWith('session-1'));
  });
});
