import { useMemo } from 'react';
import { ArrowRight, Bookmark, ChevronLeft, Search } from 'lucide-react';
import { SENTENCES, TOPIC_LABELS, type HistoryEvent, type LearningState, type Sentence } from '@voxnelo/learning';

export type View = 'practice' | 'history' | 'favorites' | 'review';

interface LibraryViewProps {
  view: Exclude<View, 'practice'>;
  states: LearningState[];
  events: HistoryEvent[];
  search: string;
  notice: string;
  onSearch: (value: string) => void;
  onChoose: (item: Sentence) => void;
  onBackToPractice: () => void;
}

/** 收藏/历史/复习共用列表视图：搜索过滤后点一次回到练习。 */
export function LibraryView({
  view,
  states,
  events,
  search,
  notice,
  onSearch,
  onChoose,
  onBackToPractice,
}: LibraryViewProps) {
  const filtered = useMemo(() => {
    const unique = new Set<string>();
    if (view === 'history')
      events.filter((e) => e.type === 'view' || e.type === 'practice').forEach((event) => unique.add(event.sentenceId));
    if (view === 'favorites') states.filter((s) => s.favorite).forEach((s) => unique.add(s.sentenceId));
    if (view === 'review') states.filter((s) => s.review).forEach((s) => unique.add(s.sentenceId));
    return [...unique]
      .map((id) => SENTENCES.find((s) => s.id === id))
      .filter((s): s is Sentence => Boolean(s))
      .filter((s) => `${s.english} ${s.chinese}`.toLowerCase().includes(search.trim().toLowerCase()));
  }, [events, states, search, view]);

  return (
    <>
      <div className="libraryTitle">
        <div>
          <span className="eyebrow">YOUR PERSONAL COLLECTION</span>
          <h1>{view === 'history' ? '最近学过的句子' : view === 'favorites' ? '我的收藏' : '需要复习'}</h1>
          <p>找到想练的句子，点一次就能回到练习。</p>
        </div>
        <button className="backPractice" onClick={onBackToPractice}>
          <ChevronLeft size={17} />
          返回练习
        </button>
      </div>
      <div className="searchBox">
        <Search size={18} />
        <input
          aria-label="搜索历史短句"
          placeholder="搜索英语或中文…"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
        />
      </div>
      <div className="libraryList">
        {filtered.length ? (
          filtered.map((sentence) => (
            <button key={sentence.id} className="libraryItem" onClick={() => onChoose(sentence)}>
              <div>
                <strong>{sentence.english}</strong>
                <span>{sentence.chinese}</span>
              </div>
              <div className="libraryMeta">
                {TOPIC_LABELS[sentence.topic]} <ArrowRight size={17} />
              </div>
            </button>
          ))
        ) : (
          <div className="empty">
            <Bookmark size={25} />
            <strong>这里暂时还没有短句</strong>
            <span>去练习几句英语，喜欢的内容就会出现在这里。</span>
            <button onClick={onBackToPractice}>
              开始练习 <ArrowRight size={15} />
            </button>
          </div>
        )}
      </div>
      {notice ? (
        <div className="notice" role="status">
          {notice}
        </div>
      ) : null}
    </>
  );
}
