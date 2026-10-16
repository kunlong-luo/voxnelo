/* AudioWorklet must execute as JavaScript; this checked-in source is TypeScript.
 * Build to public/audio/pcm-worklet.js before Rsbuild copies static assets.
 * Noise suppression is requested from the media device, not fabricated here. */
declare const AudioWorkletProcessor: {new(): {readonly port: MessagePort}};
declare function registerProcessor(name: string, processor: new () => {process(inputs: Float32Array[][]): boolean}): void;

class VoxneloPcmProcessor extends AudioWorkletProcessor {
  private samples = new Float32Array(1600);
  private count = 0;

  process(inputs: Float32Array[][]): boolean {
    const mono = inputs[0]?.[0];
    if (mono) {
      for (let i = 0; i < mono.length; i++) {
        this.samples[this.count++] = mono[i] ?? 0;
        if (this.count === this.samples.length) {
          this.port.postMessage(this.samples, [this.samples.buffer as ArrayBuffer]);
          this.samples = new Float32Array(1600);
          this.count = 0;
        }
      }
    }
    return true;
  }
}

registerProcessor('voxnelo-pcm-16k', VoxneloPcmProcessor);
