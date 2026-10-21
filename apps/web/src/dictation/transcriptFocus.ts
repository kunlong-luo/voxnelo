/**
 * Render a bounded current subtitle without rewriting the native recognizer's
 * cumulative final transcript (or changing WER, playback, privacy or storage).
 * The complete finalized text is available separately in a collapsed history.
 */
export type TranscriptFocus={
  text:string;
  source:'interim'|'recent-final'|'empty';
  hasHistory:boolean;
};
export function focusTranscript(finalText:string,interimText:string,maxWords=18):TranscriptFocus{
  if(!Number.isInteger(maxWords)||maxWords<1)throw Error('Subtitle word window must be positive');
  const completed=finalText.trim();
  const provisional=interimText.trim();
  const words=(provisional||completed).match(/\S+/g)??[];
  const source=provisional?'interim':completed?'recent-final':'empty';
  return {
    text:words.length>maxWords?'… '+words.slice(-maxWords).join(' '):words.join(' '),
    source,
    hasHistory:completed.length>0,
  };
}
