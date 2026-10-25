import {describe,it,expect} from 'vitest';
import {
  defaultDesktopAsrEngine, defaultEngineAvailable, resolveDesktopAsrEngine,
} from '../apps/desktop/asrDefault';

describe('default desktop ASR engine',()=>{
  it('defaults to Moonshine on Linux, without falling back when the model is missing',()=>{
    expect(defaultDesktopAsrEngine('linux')).toBe('moonshine-medium');
    expect(resolveDesktopAsrEngine('linux',undefined)).toBe('moonshine-medium');
    expect(defaultEngineAvailable('linux',{moonshineMedium:false,zipformer:true})).toBe(false);
    expect(defaultEngineAvailable('linux',{moonshineMedium:true,zipformer:false})).toBe(true);
  });
  it('defaults to opt-in Moonshine on Windows/macOS without silently using Zipformer',()=>{
    for(const platform of ['win32','darwin']){
      expect(defaultDesktopAsrEngine(platform)).toBe('moonshine-medium');
      expect(defaultEngineAvailable(platform,{moonshineMedium:true,zipformer:false})).toBe(true);
      expect(defaultEngineAvailable(platform,{moonshineMedium:false,zipformer:true})).toBe(false);
    }
    expect(defaultDesktopAsrEngine('freebsd')).toBe('zipformer');
  });
  it('rejects unknown IPC engine identifiers',()=>{
    expect(resolveDesktopAsrEngine('linux','external-code')).toBeNull();
    expect(resolveDesktopAsrEngine('linux',null)).toBeNull();
    expect(resolveDesktopAsrEngine('linux','moonshine-medium')).toBe('moonshine-medium');
  });
});
