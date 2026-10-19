/**
 * Continuous, band-limited 16 kHz converter for streaming speech.
 *
 * A linear interpolator alone aliases frequencies above 8 kHz into the
 * recognizer's speech band when microphone hardware runs at 44.1/48/96 kHz.
 * Use a normalized 48-tap windowed-sinc low pass before reducing the rate.
 * All state survives AudioWorklet's 128-frame quantum boundaries.
 *
 * This preserves captured audio without uploading or persisting PCM.
 */
export const ASR_SAMPLE_RATE = 16000;
const HALF_TAPS = 24;
const TAP_COUNT = HALF_TAPS * 2;
const PHASES = 256;
const RING_SIZE = 128;

export class StreamingResampler16k {
  private readonly unchanged: boolean;
  private readonly step: number;
  private readonly kernel: Float32Array[];
  private readonly ring = new Float32Array(RING_SIZE);
  private sampleIndex = 0;
  private nextPosition = 0;

  constructor(inputRate: number) {
    if (!Number.isFinite(inputRate) || inputRate < 8000 || inputRate > 192000) {
      throw new Error('Unsupported microphone sample rate');
    }
    this.unchanged = inputRate === ASR_SAMPLE_RATE;
    this.step = inputRate / ASR_SAMPLE_RATE;
    this.kernel = [];
    if (this.unchanged) return;
    // At high input rates the cutoff must stay below the *output* Nyquist,
    // not the microphone Nyquist, to avoid folding high-frequency noise.
    const cutoff = Math.min(1, ASR_SAMPLE_RATE / inputRate) * 0.93;
    for (let phase = 0; phase < PHASES; phase++) {
      const weights = new Float32Array(TAP_COUNT);
      let total = 0;
      for (let tap = 0; tap < TAP_COUNT; tap++) {
        const x = tap - (HALF_TAPS - 1) - phase / PHASES;
        const sincx = x === 0 ? 1 : Math.sin(Math.PI * cutoff * x) / (Math.PI * cutoff * x);
        const window = 0.5 + 0.5 * Math.cos(Math.PI * x / HALF_TAPS);
        const weight = cutoff * sincx * window;
        weights[tap] = weight;
        total += weight;
      }
      for (let tap = 0; tap < TAP_COUNT; tap++) weights[tap] = (weights[tap] ?? 0) / total;
      this.kernel.push(weights);
    }
  }

  /** Return 16 kHz samples in order. Never construct a full-session PCM buffer. */
  push(value: number, emit: (sample: number) => void): void {
    const sample = Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0;
    if (this.unchanged) {
      emit(sample);
      return;
    }
    this.ring[this.sampleIndex % RING_SIZE] = sample;
    // A tiny fixed lookahead prevents interpolating with unavailable future
    // inputs. It adds less than 3 ms even on an 8 kHz capture device.
    while (this.nextPosition + HALF_TAPS <= this.sampleIndex) {
      const center = Math.floor(this.nextPosition);
      const fractional = this.nextPosition - center;
      const phase = Math.min(PHASES - 1, Math.floor(fractional * PHASES));
      const weights = this.kernel[phase]!;
      let filtered = 0;
      for (let tap = 0; tap < TAP_COUNT; tap++) {
        const index = center + tap - (HALF_TAPS - 1);
        if (index < 0) continue;
        filtered += (this.ring[index % RING_SIZE] ?? 0) * (weights[tap] ?? 0);
      }
      emit(Math.max(-1, Math.min(1, filtered)));
      this.nextPosition += this.step;
    }
    this.sampleIndex++;
  }
}
