import { useMemo } from 'react';
import { useI18n, type TranslationKey } from './i18n';
import { ArrowRight, Bookmark, ChevronLeft, Search, Heart, Clock3, ListRestart } from 'lucide-react';
import { SENTENCES, type HistoryEvent, type LearningState, type Sentence } from '@voxnelo/learning';

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

const viewInfo: Record<'history'|'favorites'|'review', {title: TranslationKey; helper: TranslationKey; icon: typeof Clock3}> = {
  history: { title: 'libHistoryTitle', helper: 'libHistoryHelp', icon: Clock3 },
  favorites: { title: 'libFavoritesTitle', helper: 'libFavoritesHelp', icon: Heart },
  review: { title: 'libReviewTitle', helper: 'libReviewHelp', icon: ListRestart },
};
const topics: Record<Sentence['topic'], TranslationKey> = {
  greetings: 'topicGreetings', personal: 'topicPersonal', needs: 'topicNeeds',
  learning: 'topicLearning', daily: 'topicDaily',
};

/** 收藏、历史和复习：统一品牌卡片布局，保持原有功能与搜索规则。 */
export function LibraryView({
  view, states, events, search, notice, onSearch, onChoose, onBackToPractice,
}: LibraryViewProps) {
  const {t} = useI18n();
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
          <div className="eyebrow"><Icon size={15} /> {t('libraryEyebrow')}</div>
          <h1>{t(title)}</h1><p>{t(helper)}</p>
        </div>
        <button type="button" className="backPractice" onClick={onBackToPractice}>
          <ChevronLeft size={17} /> {t('backPractice')}
        </button>
      </div>
      <section className="libraryCard" aria-label={t(title)}>
        <div className="libraryToolbar">
          <span className="libraryCount">{t('libraryCount',{count:filtered.length})}</span>
          <div className="searchBox">
            <Search size={18} />
            <input aria-label={t("searchAria")} placeholder={t("searchPlaceholder")}
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
                <div className="libraryMeta"><span>{t(topics[sentence.topic])}</span><ArrowRight size={17} /></div>
              </button>
            ))
          ) : (
            <div className="empty">
              <span className="emptyIcon"><Bookmark size={26} /></span>
              <strong>{t('libraryEmptyTitle')}</strong>
              <span>{t(search ? 'libraryEmptySearch' : 'libraryEmptyHint')}</span>
              <button type="button" onClick={onBackToPractice}>
                {t('libraryStart')} <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>
      </section>
      {notice ? <div className="notice" role="status">{notice}</div> : null}
    </div>
  );
}
