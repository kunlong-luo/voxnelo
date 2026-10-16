import { SENTENCES, type HistoryEvent, type LearningState, type Sentence } from '@voxnelo/learning';

export type LibraryMode = 'history'|'favorites'|'review';
export interface LibraryEntry {
  id:string;
  sentence:Sentence;
  at?:number;
  type?:HistoryEvent['type'];
}
export const LIBRARY_PAGE_SIZE=8;

export function libraryEntries(
  view:LibraryMode,
  states:readonly LearningState[],
  events:readonly HistoryEvent[],
  search:string,
):LibraryEntry[] {
  const lookup=new Map(SENTENCES.map(sentence=>[sentence.id,sentence]));
  const query=search.trim().toLocaleLowerCase();
  const matches=(sentence:Sentence)=>!query||
    (sentence.english+' '+sentence.chinese).toLocaleLowerCase().includes(query);
  if(view==='history'){
    // The event log is the actual learning history, not a deduplicated
    // collection. Preserve repeated visits and practice attempts.
    return [...events].filter(event=>event.type==='view'||event.type==='practice')
      .sort((a,b)=>b.at-a.at || (b.id??0)-(a.id??0))
      .flatMap(event=>{
        const sentence=lookup.get(event.sentenceId);
        return sentence&&matches(sentence)?[{
          id:String(event.id??event.sentenceId+'-'+event.at+'-'+event.type),
          sentence,at:event.at,type:event.type,
        }]:[];
      });
  }
  const chosen=states.filter(state=>view==='favorites'?state.favorite:state.review)
    .sort((a,b)=>b.lastSeenAt-a.lastSeenAt);
  return chosen.flatMap(state=>{
    const sentence=lookup.get(state.sentenceId);
    return sentence&&matches(sentence)?[{
      id:state.sentenceId,sentence,at:state.lastSeenAt,
    }]:[];
  });
}

export function libraryPage<T>(entries:readonly T[],page:number,pageSize=LIBRARY_PAGE_SIZE){
  const pages=Math.max(1,Math.ceil(entries.length/pageSize));
  const current=Math.min(Math.max(1,Math.trunc(Number.isFinite(page)?page:1)),pages);
  return {page:current,pages,total:entries.length,start:entries.length?(current-1)*pageSize+1:0,
    end:Math.min(current*pageSize,entries.length),
    items:entries.slice((current-1)*pageSize,current*pageSize)};
}

export function historyTotals(events:readonly HistoryEvent[]){
  const known=new Set(SENTENCES.map(s=>s.id));
  const valid=events.filter(e=>known.has(e.sentenceId));
  return {events:valid.length,unique:new Set(valid.map(e=>e.sentenceId)).size,
    practice:valid.filter(e=>e.type==='practice').length};
}
