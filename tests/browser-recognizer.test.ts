import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BROWSER_SPEECH_LANGUAGE, browserSpeechFailureKey, createBrowserRecognizer,
  stopBrowserRecognizer, type BrowserRecognizer,
} from '../apps/web/src/dictation/browserRecognizer';

class FakeRecognizer implements BrowserRecognizer {
  lang=''; continuous=false; interimResults=false; processLocally=false;
  onresult:BrowserRecognizer['onresult']=null;
  onerror:BrowserRecognizer['onerror']=null;
  onend:BrowserRecognizer['onend']=null;
  onstart:BrowserRecognizer['onstart']=null;
  start=vi.fn(()=>this.onstart?.());
  stop=vi.fn(()=>this.onend?.());
  abort=vi.fn();
}
afterEach(()=>vi.restoreAllMocks());
describe('Isolated browser speech recognition adapter',()=>{
  it('configures offline-by-default recognition and collects real final/interim events',()=>{
    const onTranscript=vi.fn(),onStart=vi.fn(),onFailure=vi.fn(),onEnd=vi.fn();
    const callbacks={isCurrent:()=>true,onTranscript,onStart,onFailure,onEnd};
    const recognizer=createBrowserRecognizer(FakeRecognizer,'local',callbacks);
    expect(recognizer).not.toBeNull();
    expect(recognizer?.lang).toBe(BROWSER_SPEECH_LANGUAGE);
    expect(recognizer?.processLocally).toBe(true);
    expect(recognizer?.continuous).toBe(true);
    expect(recognizer?.interimResults).toBe(true);
    recognizer?.start();
    expect(onStart).toHaveBeenCalledOnce();
    recognizer?.onresult?.({resultIndex:0,results:[
      {isFinal:true,0:{transcript:'  Good  '}},
      {isFinal:false,0:{transcript:' morning '}},
    ]});
    expect(onTranscript).toHaveBeenLastCalledWith('Good','morning');
    recognizer?.onresult?.({resultIndex:1,results:[
      {isFinal:true,0:{transcript:' Good '}},
      {isFinal:true,0:{transcript:' morning '}},
    ]});
    expect(onTranscript).toHaveBeenLastCalledWith('Good morning','');
    stopBrowserRecognizer(recognizer);
    expect(recognizer?.stop).toHaveBeenCalledOnce();
    expect(recognizer?.onresult).toBeNull();
  });
  it('never silently falls back to browser cloud recognition without local support',()=>{
    class NoLocal extends FakeRecognizer {
      declare processLocally:boolean;
      constructor(){super();Reflect.deleteProperty(this,'processLocally');}
    }
    const callbacks={isCurrent:()=>true,onTranscript:vi.fn(),onStart:vi.fn(),onFailure:vi.fn(),onEnd:vi.fn()};
    expect(createBrowserRecognizer(NoLocal,'local',callbacks)).toBeNull();
    const online=createBrowserRecognizer(NoLocal,'browser',callbacks);
    expect(online?.processLocally).toBe(false);
  });
  it('drops callbacks after user navigates away and maps errors accurately',()=>{
    let valid=true;
    const callbacks={isCurrent:()=>valid,onTranscript:vi.fn(),onStart:vi.fn(),onFailure:vi.fn(),onEnd:vi.fn()};
    const recognizer=createBrowserRecognizer(FakeRecognizer,'local',callbacks);
    const late=recognizer?.onresult;
    valid=false;
    late?.({resultIndex:0,results:[{isFinal:true,0:{transcript:'stale text'}}]});
    recognizer?.onerror?.({error:'network'});
    recognizer?.onend?.();
    expect(callbacks.onTranscript).not.toHaveBeenCalled();
    expect(callbacks.onFailure).not.toHaveBeenCalled();
    expect(callbacks.onEnd).not.toHaveBeenCalled();
    expect(browserSpeechFailureKey('not-allowed')).toBe('dictationPermission');
    expect(browserSpeechFailureKey('audio-capture')).toBe('dictationMicrophone');
    expect(browserSpeechFailureKey('network')).toBe('dictationServiceUnavailable');
    expect(browserSpeechFailureKey('no-speech')).toBeNull();
  });
});
