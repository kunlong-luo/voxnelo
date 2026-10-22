import {describe,it,expect} from 'vitest';
import {normalizeAsrWorkerEvent} from '../apps/desktop/asrEngineContract';

describe('engine-neutral ASR worker messages',()=>{
  it('accepts the known lifecycle without forwarding extra properties',()=>{
    for(const type of ['ready','drained','finished','failure'] as const)
      expect(normalizeAsrWorkerEvent({type,privatePath:'/home/user/model'})).toEqual({type});
  });
  it('bounds transcript strings and removes untrusted worker metadata',()=>{
    const result=normalizeAsrWorkerEvent({type:'result',
      finalText:'a'.repeat(9000),interimText:'b'.repeat(2000),modelDir:'/private'});
    expect(result).toEqual({type:'result',finalText:'a'.repeat(8000),
      interimText:'b'.repeat(1000)});
  });
  it('rejects invalid result payloads and unexpected messages',()=>{
    for(const value of [null,{},[],{type:'result',finalText:1,interimText:''},
      {type:'result',finalText:'',interimText:null},{type:'debug',text:'private'}])
      expect(normalizeAsrWorkerEvent(value)).toBeNull();
  });
});
