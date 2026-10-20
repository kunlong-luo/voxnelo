/**
 * Streaming decoders sometimes have ready frames left after the 64-step
 * per-packet fairness budget. Ending input is not proof all frames decoded.
 *
 * This helper is native-addon independent, deterministic and bounded; the
 * worker owns endpoint handling and user-visible results separately.
 */
export const PCM_DECODE_STEPS = 64;
export const FINAL_DECODE_STEPS = 4096;

export interface ReadyFrameDecoder<Stream> {
  isReady(stream: Stream): boolean;
  decode(stream: Stream): void;
}

export function drainReadyFrames<Stream>(
  recognizer: ReadyFrameDecoder<Stream>,
  stream: Stream,
  limit: number,
  onProgress?: (decodedFrames:number)=>void,
): { decodedFrames: number; fullyDrained: boolean } {
  if (!Number.isSafeInteger(limit) || limit < 1) throw Error('Invalid ASR decoding budget');
  let decodedFrames = 0;
  while (decodedFrames < limit && recognizer.isReady(stream)) {
    recognizer.decode(stream);
    decodedFrames++;
    // Native recognition is synchronous and can need many decode steps.
    // Let the worker publish confirmed partial text between frame batches,
    // not only after the entire 64-step packet has finished decoding.
    if(onProgress && decodedFrames%8===0)onProgress(decodedFrames);
  }
  // Explicitly recheck after the last permitted decode. Reaching the budget
  // does not mean audio is fully consumed, particularly after inputFinished().
  return { decodedFrames, fullyDrained: !recognizer.isReady(stream) };
}
