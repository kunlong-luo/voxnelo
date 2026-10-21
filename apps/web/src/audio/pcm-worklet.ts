/* TypeScript source compiled to public/audio/pcm-worklet.js.
 * AudioWorklet runs on the audio render thread, not the React UI thread.
 * Device DSP (noiseSuppression/echoCancellation/AGC) is requested through
 * getUserMedia; it is not simulated here.
 */
import { StreamingResampler16k } from './streaming-resampler';

declare const sampleRate: number;
declare const AudioWorkletProcessor: {new(): {readonly port: MessagePort}};
declare function registerProcessor(name: string, processor: new () => {process(inputs: Float32Array[][]): boolean}): void;

const CHUNK_SIZE = 800; // 50 ms at 16 kHz, mono; keep ASR input responsive

class VoxneloPcmProcessor extends AudioWorkletProcessor {
  private readonly resampler = new StreamingResampler16k(sampleRate);

  constructor() {
    super();
    this.port.onmessage = (event: MessageEvent<{type?:string}>) => {
      if (event.data?.type !== 'flush') return;
      // Partial PCM buffers were previously lost when the user stopped
      // listening. Preserve actual final PCM length; do NOT pad with invented
      // silence. Messages from this port are delivered in FIFO order, so the
      // "flushed" acknowledgement follows the final PCM chunk.
      if (this.outputLength > 0) {
        const remaining = this.output.slice(0, this.outputLength);
        this.port.postMessage(remaining, [remaining.buffer as ArrayBuffer]);
        this.output = new Float32Array(CHUNK_SIZE);
        this.outputLength = 0;
      }
      this.port.postMessage({type:'flushed'});
    };
  }
  private output = new Float32Array(CHUNK_SIZE);
  private outputLength = 0;
  private readonly emitSample = (sample:number):void => {
    this.output[this.outputLength++] = sample;
    if (this.outputLength === CHUNK_SIZE) {
      this.port.postMessage(this.output, [this.output.buffer as ArrayBuffer]);
      this.output = new Float32Array(CHUNK_SIZE);
      this.outputLength = 0;
    }
  };

  process(inputs: Float32Array[][]): boolean {
    const channels = inputs[0];
    if (!channels?.[0]) return true;
    const length = channels[0].length;

    for (let i = 0; i < length; i++) {
      // Most microphones honor the mono constraint, but some expose stereo.
      // Taking only channel 0 can throw away the speaker's voice when channel
      // 1 has the active input. Downmix all available channels before filtering.
      let value = 0;
      for (const channel of channels) value += channel[i] ?? 0;
      this.resampler.push(value / channels.length, this.emitSample);
    }
    return true;
  }
}
registerProcessor('voxnelo-pcm-16k', VoxneloPcmProcessor);

export {}; // Keep this a module for TS / esbuild.
