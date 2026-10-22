/** Keep a bounded, recent context for UI events without duplicating interim text. */
export function appendRecentWords(history:string[], phrase:string, maxWords=120):void {
  if(!Number.isSafeInteger(maxWords)||maxWords<1)throw new RangeError('Invalid word limit');
  const words=phrase.trim().split(/\s+/u).filter(Boolean);
  if(words.length===0)return;
  history.push(...words.slice(-maxWords));
  if(history.length>maxWords)history.splice(0,history.length-maxWords);
}
