import {describe,it,expect} from 'vitest';
import {engineChoices,selectOfflineEngine} from '../apps/desktop/asrEngineSelection';
describe('safe offline engine switching policy',()=>{
  const legacy={zipformer:true,moonshineModelVerified:false,moonshineRuntimeVerified:false,moonshineStreamConnected:false};
  it('keeps existing offline engine selectable',()=>{
    expect(selectOfflineEngine('zipformer',legacy)).toEqual({ok:true,engine:'zipformer'});
  });
  it('rejects Moonshine unless all independent gates pass',()=>{
    for(const key of ['moonshineModelVerified','moonshineRuntimeVerified','moonshineStreamConnected'] as const){
      const candidate={...legacy,moonshineModelVerified:true,moonshineRuntimeVerified:true,moonshineStreamConnected:true,[key]:false};
      expect(selectOfflineEngine('moonshine-medium',candidate)).toEqual({ok:false,reason:'unavailable'});
    }
    expect(engineChoices(legacy)['moonshine-medium'].reason).toBe('unverified-model');
  });
  it('allows explicit switching only when verified',()=>{
    expect(selectOfflineEngine('moonshine-medium',{zipformer:true,moonshineModelVerified:true,moonshineRuntimeVerified:true,moonshineStreamConnected:true}))
      .toEqual({ok:true,engine:'moonshine-medium'});
    expect(selectOfflineEngine('../payload',legacy)).toEqual({ok:false,reason:'unsupported'});
  });
  it('never claims fallback works when legacy pack is absent',()=>{
    expect(selectOfflineEngine('zipformer',{...legacy,zipformer:false})).toEqual({ok:false,reason:'unavailable'});
  });
});
