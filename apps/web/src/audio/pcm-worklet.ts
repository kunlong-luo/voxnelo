/* TypeScript source compiled to public/audio/pcm-worklet.js.
 * AudioWorklet runs on the audio render thread, not the React UI thread.
 * Device DSP (noiseSuppression/echoCancellation/AGC) is requested through
 * getUserMedia; it is not simulated here.
 */
declare const sampleRate: number;
declare const AudioWorkletProcessor: {new(): {readonly port: MessagePort}};
declare function registerProcessor(name: string, processor: new () => {process(inputs: Float32Array[][]): boolean}): void;

const ASR_RATE = 16000;
const CHUNK_SIZE = 1600; // 100 ms at 16 kHz, mono

class VoxneloPcmProcessor extends AudioWorkletProcessor {
  private output = new Float32Array(CHUNK_SIZE);
  private outputLength = 0;
  private inputIndex = 0;
  private nextOutputIndex = 0;
  private lastInput = 0;
  private readonly inputStep = sampleRate / ASR_RATE;

  process(inputs: Float32Array[][]): boolean {
    const mono = inputs[0]?.[0];
    if (!mono) return true;

    for (let i = 0; i < mono.length; i++) {
      const value = mono[i] ?? 0;
      // Linear interpolation from the device's actual sample rate to 16 kHz.
      // Use absolute sample positions so adjacent 128-frame render quanta do
      // not accumulate rounding errors or lose samples at their boundaries.
      while (this.nextOutputIndex <= this.inputIndex) {
        const ratio = this.inputIndex === 0 ? 1 : this.nextOutputIndex - (this.inputIndex - 1);
        this.output[this.outputLength++] = this.inputIndex === 0
          ? value
          : this.lastInput + (value - this.lastInput) * ratio;
        if (this.outputLength === CHUNK_SIZE) {
          this.port.postMessage(this.output, [this.output.buffer as ArrayBuffer]);
          this.output = new Float32Array(CHUNK_SIZE);
          this.outputLength = 0;
        }
        this.nextOutputIndex += this.inputStep;
      }
      this.lastInput = value;
      this.inputIndex++;
    }
    return true;
  }
}
registerProcessor('voxnelo-pcm-16k', VoxneloPcmProcessor);

export {}; // Allow importing the TypeScript worklet source in unit tests.
