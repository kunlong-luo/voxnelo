import { useMemo } from 'react';
import { ArrowRight, Bookmark, ChevronLeft, Search, Heart, Clock3, ListRestart } from 'lucide-react';
import { SENTENCES, TOPIC_LABELS, type HistoryEvent, type LearningState, type Sentence } from '@voxnelo/learning';

export type View = 'practice' | 'history' | 'favorites' | 'review' | 'settings';

interface LibraryViewProps {
  view: Exclude<View, 'practice' | 'settings'>;
  states: LearningState[];
  events: HistoryEvent[];
  search: string;
  notice: string;
  onSearch: (value: string) => void;
  onChoose: (item: Sentence) => void;
  onBackToPractice: () => void;
}

const viewInfo = {
  history: { title: '最近学过的句子', helper: '浏览与录音尝试都会留在本地记录中。', icon: Clock3 },
  favorites: { title: '我的收藏', helper: '喜欢的表达，都可以随时回来练习。', icon: Heart },
  review: { title: '需要复习', helper: '把暂时不熟悉的句子放在这里，慢慢变得熟练。', icon: ListRestart },
};

/** 收藏、历史和复习：统一品牌卡片布局，保持原有功能与搜索规则。 */
export function LibraryView({
  view, states, events, search, notice, onSearch, onChoose, onBackToPractice,
}: LibraryViewProps) {
  const filtered = useMemo(() => {
    const unique = new Set<string>();
    if (view === 'history')
      events.filter((event) => event.type === 'view' || event.type === 'practice')
        .forEach((event) => unique.add(event.sentenceId));
    if (view === 'favorites') states.filter((state) => state.favorite).forEach((state) => unique.add(state.sentenceId));
    if (view === 'review') states.filter((state) => state.review).forEach((state) => unique.add(state.sentenceId));
    return [...unique]
      .map((id) => SENTENCES.find((sentence) => sentence.id === id))
      .filter((sentence): sentence is Sentence => Boolean(sentence))
      .filter((sentence) => (sentence.english + ' ' + sentence.chinese).toLowerCase().includes(search.trim().toLowerCase()));
  }, [events, states, search, view]);
  const { title, helper, icon: Icon } = viewInfo[view];
  return (
    <div className="libraryPage">
      <div className="libraryTitle">
        <div>
          <div className="eyebrow"><Icon size={15} /> YOUR LEARNING LIBRARY</div>
          <h1>{title}</h1><p>{helper}</p>
        </div>
        <button type="button" className="backPractice" onClick={onBackToPractice}>
          <ChevronLeft size={17} /> 返回练习
        </button>
      </div>
      <section className="libraryCard" aria-label={title}>
        <div className="libraryToolbar">
          <span className="libraryCount">共 {filtered.length} 句</span>
          <div className="searchBox">
            <Search size={18} />
            <input aria-label="搜索历史短句" placeholder="搜索英语或中文…"
              value={search} onChange={(event) => onSearch(event.target.value)} />
          </div>
        </div>
        <div className="libraryList">
          {filtered.length ? (
            filtered.map((sentence) => (
              <button type="button" key={sentence.id} className="libraryItem" onClick={() => onChoose(sentence)}>
                <div className="librarySentence">
                  <strong>{sentence.english}</strong><span>{sentence.chinese}</span>
                </div>
                <div className="libraryMeta"><span>{TOPIC_LABELS[sentence.topic]}</span><ArrowRight size={17} /></div>
              </button>
            ))
          ) : (
            <div className="empty">
              <span className="emptyIcon"><Bookmark size={26} /></span>
              <strong>这里暂时还没有短句</strong>
              <span>{search ? '没有找到匹配的短句，换个关键词试试。' : '去练习几句英语，喜欢的内容就会出现在这里。'}</span>
              <button type="button" onClick={onBackToPractice}>
                开始练习 <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>
      </section>
      {notice ? <div className="notice" role="status">{notice}</div> : null}
    </div>
  );
}
