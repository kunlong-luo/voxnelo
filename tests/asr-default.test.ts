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
  it('does not unexpectedly change Windows or macOS before their runtimes are ported',()=>{
    expect(defaultDesktopAsrEngine('win32')).toBe('zipformer');
    expect(defaultDesktopAsrEngine('darwin')).toBe('zipformer');
    expect(defaultEngineAvailable('darwin',{moonshineMedium:true,zipformer:false})).toBe(false);
  });
  it('rejects unknown IPC engine identifiers',()=>{
    expect(resolveDesktopAsrEngine('linux','external-code')).toBeNull();
    expect(resolveDesktopAsrEngine('linux',null)).toBeNull();
    expect(resolveDesktopAsrEngine('linux','moonshine-medium')).toBe('moonshine-medium');
  });
});
