/**
 * Present uppercase-only English ASR output as readable sentence case.
 *
 * Some offline sherpa-onnx vocabularies emit only uppercase tokens. Convert
 * text for display ONLY: keep worker IPC results, hook state, acceptance
 * transcripts and WER measurements byte-for-byte unchanged.
 *
 * Mixed-case recognition already carries casing information; do not override
 * it. Never invent punctuation or replace the native model's words.
 */
const knownAcronyms=new Set([
  'AI','API','ASR','CPU','GPU','GPS','USB','URL','NASA','HTML','HTTP','HTTPS','SQL','PDF','BBC','USA','UK',
]);

export function formatAsrTranscriptForDisplay(text:string):string{
  if(!/[A-Z]/.test(text)||/[a-z]/.test(text))return text;
  const normalized=text.toLowerCase().replace(/\b[a-z]+\b/g,word=>{
    const upper=word.toUpperCase();
    if(knownAcronyms.has(upper))return upper;
    if(word==='i')return 'I';
    if(word==='english')return 'English';
    return word;
  });
  return normalized.replace(/(^|[.!?][\s]+|\n[\s]*)([a-z])/g,(_whole:string,prefix:string,first:string)=>
    prefix+first.toUpperCase());
}
