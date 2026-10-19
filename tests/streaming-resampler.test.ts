import { describe, expect, it } from 'vitest';
import { ASR_SAMPLE_RATE, StreamingResampler16k } from '../apps/web/src/audio/streaming-resampler';

function capture(inputRate: number, frequency: number, duration=0.5, amp=0.75): number[] {
  const converter = new StreamingResampler16k(inputRate);
  const output:number[]=[];
  for(let i=0;i<Math.round(inputRate*duration);i++){
    converter.push(amp*Math.sin(2*Math.PI*frequency*i/inputRate),v=>output.push(v));
  }
  return output;
}
function rms(values:number[]):number {
  const stable=values.slice(400);
  return Math.sqrt(stable.reduce((sum,v)=>sum+v*v,0)/stable.length);
}

describe('16 kHz microphone streaming resampling',()=>{
  it('preserves an already-16kHz microphone waveform with no added filtering',()=>{
    const input=new Float32Array([0,0.25,-0.5,0.8,1,-1]);
    const output:number[]=[];
    const resampler=new StreamingResampler16k(16000);
    for(const value of input)resampler.push(value,v=>output.push(v));
    expect(output).toEqual(Array.from(input));
  });

  it.each([44100,48000,96000])('preserves low-frequency speech sampled at %i Hz',rate=>{
    const out=capture(rate,1000);
    expect(out.length).toBeGreaterThan(7900);
    expect(out.length).toBeLessThanOrEqual(8000);
    expect(rms(out)).toBeGreaterThan(0.45);
    expect(rms(out)).toBeLessThan(0.59);
    expect(out.every(Number.isFinite)).toBe(true);
  });

  it.each([44100,48000,96000])('suppresses 12kHz noise which would alias into speech at %i Hz',rate=>{
    const clean=rms(capture(rate,1000));
    const noisy=rms(capture(rate,12000));
    expect(noisy).toBeLessThan(clean*0.12);
  });

  it('keeps state across arbitrary AudioWorklet frame boundaries without drift',()=>{
    const rate=44100,duration=0.55;
    const frames=Array.from({length:Math.round(rate*duration)},(_,i)=>Math.sin(i*0.13)*0.6);
    const single=new StreamingResampler16k(rate);
    const chunked=new StreamingResampler16k(rate);
    const a:number[]=[],b:number[]=[];
    frames.forEach(v=>single.push(v,x=>a.push(x)));
    for(let index=0;index<frames.length;index+=128)
      frames.slice(index,index+128).forEach(v=>chunked.push(v,x=>b.push(x)));
    expect(b).toEqual(a);
    expect(a.length).toBeGreaterThan(ASR_SAMPLE_RATE*duration-30);
  });

  it('constrains invalid/malformed samples and rejects impossible device rates',()=>{
    expect(()=>new StreamingResampler16k(0)).toThrow(/sample rate/);
    expect(()=>new StreamingResampler16k(NaN)).toThrow(/sample rate/);
    const output:number[]=[];
    const converter=new StreamingResampler16k(16000);
    for(const value of [NaN,Infinity,-Infinity,2,-3])
      converter.push(value,sample=>output.push(sample));
    expect(output).toEqual([0,0,0,1,-1]);
  });
});
