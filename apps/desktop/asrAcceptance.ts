/**
 * Genuine offline ASR acceptance, never a mock transcript or synthetic score.
 * The evaluator consumes text emitted by the native worker from real PCM.
 */
export interface RealAsrQuality {
  transcript: string;
  realTimeFactor: number;
  reference?: string;
  wordErrorRate?: number | null;
}
export function requireRealAsrQuality(
  result: RealAsrQuality,
  limits: {maxRealTimeFactor?:number;maxWordErrorRate?:number} = {},
):void {
  const maxRtf=limits.maxRealTimeFactor ?? 1;
  const maxWer=limits.maxWordErrorRate ?? 0.5;
  if(!result.transcript.trim())throw Error('Real offline ASR produced no transcript');
  if(!Number.isFinite(result.realTimeFactor)||result.realTimeFactor<=0||result.realTimeFactor>maxRtf)
    throw Error('Offline ASR is too slow for live dictation (RTF '+result.realTimeFactor+')');
  if(result.reference!==undefined){
    if(result.wordErrorRate===undefined||result.wordErrorRate===null||
       !Number.isFinite(result.wordErrorRate)||result.wordErrorRate<0||
       result.wordErrorRate>maxWer)
      throw Error('Offline ASR recognition quality failed (WER '+result.wordErrorRate+')');
  }
}
