/** Transport-neutral contract for current Zipformer and future streaming engines.
 * Never expose native paths, raw microphone samples, or exceptions to renderer.
 * Generation/session isolation remains enforced by the Electron main process.
 */
export type AsrEngineId = 'zipformer' | 'moonshine-medium';
export type AsrWorkerEvent =
  | { type:'ready' }
  | { type:'drained' }
  | { type:'result'; finalText:string; interimText:string }
  | { type:'finished' }
  | { type:'failure' };

const MAX_FINAL_LENGTH=8000;
const MAX_INTERIM_LENGTH=1000;
export function normalizeAsrWorkerEvent(value:unknown):AsrWorkerEvent|null {
  if(value===null||typeof value!=='object'||Array.isArray(value))return null;
  const event=value as Record<string,unknown>;
  switch(event.type){
    case 'ready':return {type:'ready'};
    case 'drained':return {type:'drained'};
    case 'finished':return {type:'finished'};
    case 'failure':return {type:'failure'};
    case 'result':
      if(typeof event.finalText!=='string'||typeof event.interimText!=='string')return null;
      return {type:'result',
        finalText:event.finalText.slice(0,MAX_FINAL_LENGTH),
        interimText:event.interimText.slice(0,MAX_INTERIM_LENGTH)};
    default:return null;
  }
}
