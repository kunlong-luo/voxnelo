import { describe, expect, it, vi } from 'vitest';
import { drainReadyFrames, PCM_DECODE_STEPS, FINAL_DECODE_STEPS } from '../apps/desktop/asrDecodeDrain';

function recognizerWithFrames(count:number) {
  const state={ready:count,decoded:0};
  const recognizer={
    isReady:vi.fn(()=>state.ready>0),
    decode:vi.fn(()=>{
      if(state.ready<1)throw Error('Decoder called with no audio frames');
      state.ready--;state.decoded++;
    }),
  };
  return {recognizer,state};
}

describe('offline ASR decoder drain completeness',()=>{
  it('keeps the existing small packet budget but drains the remaining >64 frames at finish',()=>{
    const {recognizer,state}=recognizerWithFrames(190);
    const perPacket=drainReadyFrames(recognizer,state,PCM_DECODE_STEPS);
    expect(perPacket).toEqual({decodedFrames:64,fullyDrained:false});
    expect(state.ready).toBe(126);
    // A final command must not return a transcript after just 64 decodes.
    const finishing=drainReadyFrames(recognizer,state,FINAL_DECODE_STEPS);
    expect(finishing).toEqual({decodedFrames:126,fullyDrained:true});
    expect(state.ready).toBe(0);
    expect(recognizer.decode).toHaveBeenCalledTimes(190);
  });

  it('marks an abnormally stuck recognizer incomplete instead of falsely accepting its partial text',()=>{
    const recognize={
      isReady:vi.fn(()=>true),
      decode:vi.fn(),
    };
    const result=drainReadyFrames(recognize,null,FINAL_DECODE_STEPS);
    expect(result).toEqual({decodedFrames:FINAL_DECODE_STEPS,fullyDrained:false});
    expect(recognize.decode).toHaveBeenCalledTimes(FINAL_DECODE_STEPS);
    // The Worker rejects this result before emitting {type:'finished'}.
  });

  it('does not create audio or decode steps for an empty/past-end stream',()=>{
    const {recognizer,state}=recognizerWithFrames(0);
    expect(drainReadyFrames(recognizer,state,FINAL_DECODE_STEPS))
      .toEqual({decodedFrames:0,fullyDrained:true});
    expect(recognizer.decode).not.toHaveBeenCalled();
  });

  it('reports boundary completion when the last allowed frame was the last pending frame',()=>{
    const {recognizer,state}=recognizerWithFrames(PCM_DECODE_STEPS);
    expect(drainReadyFrames(recognizer,state,PCM_DECODE_STEPS))
      .toEqual({decodedFrames:PCM_DECODE_STEPS,fullyDrained:true});
  });

  it('never executes an unbounded, zero or nonfinite decoder budget',()=>{
    const {recognizer,state}=recognizerWithFrames(1);
    for (const budget of [0,-1,1.5,NaN,Infinity]) {
      expect(()=>drainReadyFrames(recognizer,state,budget)).toThrow(/Invalid ASR decoding budget/);
    }
    expect(recognizer.decode).not.toHaveBeenCalled();
  });
});
