import { afterEach, describe, expect, it, vi } from 'vitest';

type Processor = { process(inputs: Float32Array[][]): boolean };
type ProcessorConstructor = new () => Processor;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('Microphone AudioWorklet resampling', () => {
  it.each([16000, 44100, 48000])('produces exactly 16k PCM samples per second from %i Hz input', async (rate) => {
    const sent: Float32Array[] = [];
    const registered = new Map<string, ProcessorConstructor>();

    class TestWorkletBase {
      readonly port = {
        postMessage: (samples: Float32Array, transfer: ArrayBuffer[]) => {
          expect(transfer).toEqual([samples.buffer]);
          sent.push(new Float32Array(samples));
        },
      };
    }

    vi.stubGlobal('sampleRate', rate);
    vi.stubGlobal('AudioWorkletProcessor', TestWorkletBase);
    vi.stubGlobal('registerProcessor', (name: string, ctor: ProcessorConstructor) => registered.set(name, ctor));
    await import('../apps/web/src/audio/pcm-worklet');

    const Constructor = registered.get('voxnelo-pcm-16k');
    if (!Constructor) throw Error('PCM worklet did not register');
    const processor = new Constructor();
    for (let offset = 0; offset < rate; offset += 128) {
      const chunk = new Float32Array(Math.min(128, rate - offset));
      chunk.fill(0.25);
      expect(processor.process([[chunk]])).toBe(true);
    }
    expect(sent).toHaveLength(10);
    expect(sent.every(chunk => chunk.length === 1600 && chunk.every(sample => Math.abs(sample - 0.25) < 1e-5))).toBe(true);
  });

  it('preserves active speech on channel 1 of a stereo device',async()=>{
    const sent:Float32Array[]=[];
    const registered=new Map<string,ProcessorConstructor>();
    vi.stubGlobal('sampleRate',48000);
    vi.stubGlobal('AudioWorkletProcessor',class {
      readonly port={postMessage:(samples:Float32Array)=>sent.push(new Float32Array(samples))};
    });
    vi.stubGlobal('registerProcessor',(name:string,ctor:ProcessorConstructor)=>registered.set(name,ctor));
    await import('../apps/web/src/audio/pcm-worklet');
    const Constructor=registered.get('voxnelo-pcm-16k');
    if(!Constructor)throw Error('Worklet failed to register');
    const processor=new Constructor();
    for(let offset=0;offset<24000;offset+=128){
      const channel0=new Float32Array(128); // silent microphone channel
      const channel1=new Float32Array(Math.min(128,24000-offset));
      for(let i=0;i<channel1.length;i++)
        channel1[i]=0.8*Math.sin(2*Math.PI*1000*(offset+i)/48000);
      expect(processor.process([[channel0.subarray(0,channel1.length),channel1]])).toBe(true);
    }
    expect(sent).toHaveLength(5);
    const samples=sent.at(-1);
    if(!samples)throw Error('No output PCM');
    const rms=Math.sqrt(samples.reduce((sum,x)=>sum+x*x,0)/samples.length);
    expect(rms).toBeGreaterThan(0.2);
    expect(rms).toBeLessThan(0.4);
  });

  it('does not invent speech samples when the microphone has no input', async () => {
    const sent: Float32Array[] = [];
    const registered = new Map<string, ProcessorConstructor>();
    vi.stubGlobal('sampleRate', 48000);
    vi.stubGlobal('AudioWorkletProcessor', class {
      readonly port = { postMessage: (samples: Float32Array) => sent.push(samples) };
    });
    vi.stubGlobal('registerProcessor', (name: string, ctor: ProcessorConstructor) => registered.set(name, ctor));
    await import('../apps/web/src/audio/pcm-worklet');
    const Constructor = registered.get('voxnelo-pcm-16k');
    if (!Constructor) throw Error('PCM worklet did not register');
    const processor = new Constructor();
    for (let i = 0; i < 10; i++) processor.process([]);
    expect(sent).toHaveLength(0);
  });
});
