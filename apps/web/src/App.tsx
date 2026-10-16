import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { BarChart3, Clock3, MessageCircle, Settings2, ShieldCheck, Square, Star, type LucideIcon } from 'lucide-react';
import {
  APP_VERSION,
  FIRST_SENTENCE,
  pickNext,
  primeSpeechVoices,
  SENTENCES,
  silence,
  speak,
  summarize,
  type Sentence,
} from '@voxnelo/learning';
import { useRecorder } from './useRecorder';
import { useLiveDictation } from './useLiveDictation';
import { useLearningData } from './useLearningData';
import { PracticeView } from './PracticeView';
import { LibraryView, type View } from './LibraryView';
import { SettingsView } from './SettingsView';
import { DesktopTitlebar } from './DesktopTitlebar';
import { Button } from './components/ui/button';
import { cn } from './lib/utils';
import { applyAppearance, readAppearance, saveAppearance, type AppearanceTheme } from './appearance';
import { I18nProvider, readLanguageSetting, resolveLocale, saveLanguageSetting, setDocumentLocale, useI18n, type LanguageSetting } from './i18n';

const menu: { id: View; label: string; accessibleLabel: string; icon: LucideIcon }[] = [
  { id: 'practice', label: '练习', accessibleLabel: '开始练习', icon: MessageCircle },
  { id: 'favorites', label: '收藏', accessibleLabel: '我的收藏', icon: Star },
  { id: 'history', label: '历史', accessibleLabel: '最近学习', icon: Clock3 },
  { id: 'review', label: '复习', accessibleLabel: '需要复习', icon: BarChart3 },
  { id: 'settings', label: '设置', accessibleLabel: '设置', icon: Settings2 },
];

/** Default locale follows OS; explicit user choice is stored locally. */
export function App() {
  const [languageSetting, setLanguageSetting] = useState<LanguageSetting>(readLanguageSetting);
  const [systemLanguage, setSystemLanguage] = useState(
    () => navigator.languages?.[0] || navigator.language || 'zh-CN',
  );
  useEffect(() => {
    const changed = () => setSystemLanguage(navigator.languages?.[0] || navigator.language || 'zh-CN');
    window.addEventListener('languagechange', changed);
    return () => window.removeEventListener('languagechange', changed);
  }, []);
  const locale = resolveLocale(languageSetting, systemLanguage);
  useEffect(() => { setDocumentLocale(locale); }, [locale]);
  const changeLanguage = (next: LanguageSetting) => {
    setLanguageSetting(next);
    saveLanguageSetting(next);
  };
  return (
    <I18nProvider locale={locale}>
      <AppScreen languageSetting={languageSetting} onChangeLanguage={changeLanguage} />
    </I18nProvider>
  );
}

/** Learning state and recording logic are independent from display locale. */
function AppScreen({languageSetting,onChangeLanguage}: {
  languageSetting: LanguageSetting;
  onChangeLanguage: (next: LanguageSetting) => void;
}) {
  const {t} = useI18n();
  // React replaces the direct page node on navigation, so attach motion here.
  const [pageMotionRef]=useAutoAnimate<HTMLElement>({duration:500,easing:'ease-in-out'});
  const [sentenceId, setSentenceId] = useState(FIRST_SENTENCE.id);
  const [view, setView] = useState<View>('practice');
  const [visited, setVisited] = useState<string[]>([FIRST_SENTENCE.id]);
  const [historyPosition, setHistoryPosition] = useState(0);
  const [speed, setSpeed] = useState<'normal' | 'slow'>('normal');
  const [showIpa, setShowIpa] = useState(true);
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [appearance, setAppearance] = useState<AppearanceTheme>(readAppearance);
  const recorder = useRecorder();
  const dictation = useLiveDictation(sentenceId);
  const current = useMemo(() => SENTENCES.find((item) => item.id === sentenceId) ?? FIRST_SENTENCE, [sentenceId]);
  const recordingBusy = recorder.status === 'requesting' || recorder.status === 'recording' || dictation.active;
  const notify = useCallback((message: string) => setNotice(message), []);
  const restoreLastSentence=useCallback((id:string|undefined)=>{
    if (!id || !SENTENCES.some(item=>item.id===id)) return;
    setSentenceId(id);
    setVisited([id]);
    setHistoryPosition(0);
  },[]);
  const { states, events, setFlag } = useLearningData(
    notify, sentenceId, current.id, recorder.recordingUrl, restoreLastSentence,
  );
  const currentState = states.find((item) => item.sentenceId === current.id);
  const stats = summarize(states);

  useEffect(() => {
    primeSpeechVoices();
  }, []);

  useEffect(() => {
    applyAppearance(appearance);
  }, [appearance]);

  const changeAppearance = (next: AppearanceTheme) => {
    setAppearance(next);
    saveAppearance(next);
  };

  const display = useCallback(
    (target: Sentence) => {
      if (recordingBusy) {
        setNotice(t('recordingGuard'));
        return;
      }
      silence();
      recorder.clearAudio();
      setNotice('');
      setSentenceId(target.id);
      setView('practice');
      setVisited((history) => [...history.slice(0, historyPosition + 1), target.id]);
      setHistoryPosition((position) => position + 1);
    },
    [recordingBusy, historyPosition, recorder, t],
  );

  const nextSentence = useCallback(() => {
    if (recordingBusy) return;
    if (historyPosition < visited.length - 1) {
      const target = SENTENCES.find((s) => s.id === visited[historyPosition + 1]);
      if (target) {
        setHistoryPosition(historyPosition + 1);
        setSentenceId(target.id);
        recorder.clearAudio();
        silence();
        return;
      }
    }
    const next = pickNext(states, current.id, visited);
    if (next) display(next);
  }, [recordingBusy, historyPosition, visited, states, current.id, display, recorder]);

  const previousSentence = useCallback(() => {
    if (historyPosition <= 0 || recordingBusy) return;
    const targetId = visited[historyPosition - 1];
    if (!targetId) return;
    setHistoryPosition(historyPosition - 1);
    setSentenceId(targetId);
    recorder.clearAudio();
    silence();
  }, [historyPosition, recordingBusy, visited, recorder]);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (view !== 'practice' || recordingBusy || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target && typeof target.closest === 'function' && target.closest('input, textarea')) return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        nextSentence();
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        previousSentence();
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [view, recordingBusy, nextSentence, previousSentence]);

  const chooseFromLibrary = (item: Sentence) => {
    if (recordingBusy) {
      setNotice(t('recordingNavigate'));
      return;
    }
    display(item);
  };

  const toggleFlag = (flag: 'favorite' | 'review') => {
    void setFlag(current.id, flag, !currentState?.[flag]);
  };

  const playDemo = async () => {
    if (recordingBusy) {
      setNotice(t('recordingPlay'));
      return;
    }
    const result = await speak(current.english, speed);
    if (result.cancelled) return;
    if (result.ok) { setNotice(''); return; }
    const message = result.message ?? '';
    const issue = message.includes('sudo apt install espeak-ng') ? 'speechInstall'
      : message.includes('未找到可用的英语语音') ? 'speechUnavailable'
      : message.includes('已生成英语语音') ? 'speechPlayback'
      : message.includes('Linux 本地英语语音服务') ? 'speechSystemError'
      : message.includes('Linux 英语语音生成失败') ? 'speechSynthesisError'
      : 'speechFailed';
    setNotice(t(issue));
  };

  const handleRecorder = () => {
    if (dictation.active) return;
    if (recorder.status === 'recording') {
      recorder.stop();
    } else {
      // 示范音与录音不可重叠，防止把扬声器输出录为自己的跟读。
      silence();
      void recorder.start();
    }
  };

  const startDictation = () => {
    if (recorder.status === 'recording' || recorder.status === 'requesting') return;
    silence();
    void dictation.start();
  };

  const nav = (target: View) => {
    if (recordingBusy && target !== 'practice') {
      setNotice(t('recordingChangeView'));
      return;
    }
    setView(target);
    setSearch('');
    setNotice('');
  };

  return (
    <div className={cn("appFrame min-h-dvh bg-background text-foreground",window.voxneloDesktop?.windowControls&&"desktopFrame")}>
      <div className="shell flex min-h-dvh items-stretch">
      <aside className="sidebar sticky top-0 hidden h-dvh w-[clamp(204px,19vw,252px)] shrink-0 flex-col overflow-y-auto border-r border-border/45 bg-gradient-to-b from-sidebar via-sidebar to-brand-cream/55 px-3 pt-4 pb-5 text-sidebar-foreground shadow-[inset_-1px_0_0_rgba(255,255,255,.45)] sm:flex max-[1050px]:w-19 max-[1050px]:items-center max-[1050px]:px-2">
        <div className="brand mb-7 flex w-full items-center gap-3 rounded-[20px] border border-white/20 bg-card/20 px-2 py-2 max-[1050px]:justify-center max-[1050px]:border-0 max-[1050px]:bg-transparent max-[1050px]:px-0" aria-label="Voxnelo">
          <div className="brandMark flex size-11 shrink-0 items-center justify-center rounded-2xl bg-card/35 shadow-[0_10px_28px_-14px_rgba(60,80,70,.5)]"><img src="brand/voxnelo-mark.svg" alt="" width="44" height="44" className="size-11 rounded-2xl shadow-sm"/></div>
          <div className="brandText max-[1050px]:hidden"><strong className="text-[24px] font-extrabold tracking-[-.065em] text-foreground">Voxnelo</strong></div>
        </div>
        <div className="sidebarHint px-4 text-[10px] font-bold tracking-[.18em] text-muted-foreground uppercase max-[1050px]:hidden">{t('sidebarSpace')}</div>
        <nav className="mt-4 flex w-full flex-col gap-2" aria-label={t('navLabel')}>
          {menu.map(({ id, icon: Icon }) => (
            <Button key={id} variant="ghost" className={cn('navItem group relative h-12 w-full justify-start rounded-[17px] border border-transparent px-4 text-sm font-semibold text-sidebar-foreground/80 transition-[background-color,color,transform,box-shadow] duration-400 hover:border-primary/10 hover:bg-sidebar-accent/85 hover:text-foreground motion-safe:hover:translate-x-0.5 max-[1050px]:size-12 max-[1050px]:justify-center max-[1050px]:px-0',view===id&&'active motion-safe:animate-soft-pop border-primary/20 bg-gradient-to-r from-brand-blush/55 via-card/95 to-card/65 text-primary shadow-[0_10px_30px_-18px_rgba(70,85,72,.48)] ring-1 ring-primary/10 before:absolute before:inset-y-3 before:left-0 before:w-1 before:rounded-full before:bg-primary before:content-[\'\']')} aria-label={t(({practice:'navStart',favorites:'navMyFavorites',history:'navRecent',review:'navReviewItems',settings:'navSettings'} as const)[id])} aria-current={view === id ? 'page' : undefined} onClick={() => nav(id)}>
              <Icon size={20} strokeWidth={1.9} />
              <span className="max-[1050px]:hidden">{t(({practice:'navPractice',favorites:'navFavorites',history:'navHistory',review:'navReview',settings:'navSettings'} as const)[id])}</span>
              {id === 'favorites' && stats.favorites > 0 ? <span className="navCount ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground max-[1050px]:hidden">{stats.favorites}</span> : null}
            </Button>
          ))}
        </nav>
        <div className="sidebarBottom mt-auto flex flex-col gap-4 px-1 pt-8 max-[1050px]:hidden">
          <div className="tinyPanel privacyPanel flex flex-col gap-2.5 rounded-[24px] border border-white/55 bg-gradient-to-br from-card/85 via-card/60 to-brand-mist/20 p-4.5 text-xs leading-5 text-translation-ink shadow-[0_16px_36px_-28px_rgba(47,73,65,.45)]">
            <span className="tinyBadge flex size-10 items-center justify-center rounded-[15px] border border-primary/10 bg-secondary/85 text-primary shadow-sm"><ShieldCheck size={17} /></span>
            <strong>{t('sidebarRhythm')}</strong>
            <span>{t('sidebarLocal')}</span>
          </div>
          <div className="sidebarVersion px-1 text-[10px] text-muted-foreground">Voxnelo · Early Access {APP_VERSION}</div>
        </div>
      </aside>
      <div className="mainArea @container/workspace relative min-w-0 flex-1 overflow-clip bg-background bg-[image:var(--workspace-gradient)]">
        <DesktopTitlebar />
        <div aria-hidden="true" data-motion="ambient-drift" className="pointer-events-none absolute -top-12 right-[2%] size-56 rounded-full bg-primary/18 blur-3xl motion-safe:animate-ambient-drift sm:size-88"/>
        <div aria-hidden="true" data-motion="ambient-breathe" className="pointer-events-none absolute bottom-15 left-[4%] size-64 rounded-full bg-brand-blush/55 blur-3xl motion-safe:animate-ambient-breathe sm:size-100"/>
        <div aria-hidden="true" data-motion="ambient-breathe-secondary" className="pointer-events-none absolute top-[40%] right-[16%] size-48 rounded-full bg-brand-mist/35 blur-3xl motion-safe:animate-ambient-breathe motion-safe:[animation-delay:-3.5s] sm:size-74"/>
        {recorder.status === 'recording' ? (
          <Button variant="destructive" className="recordingQuickStop fixed right-4 bottom-24 z-60 shadow-xl motion-safe:animate-soft-pop sm:right-6 sm:bottom-6" onClick={handleRecorder}
            aria-label={t("stopFloating")}><Square size={15} fill="currentColor" aria-hidden="true" /> {t("stopRecording")}</Button>
        ) : null}
        <main ref={pageMotionRef} className="content relative z-10 mx-auto w-full max-w-380 px-4 pt-6 pb-28 sm:px-7 sm:py-9 lg:px-10 lg:py-11 2xl:px-14 2xl:py-14">
          {view === 'practice' ? (
            <PracticeView
              current={current}
              currentState={currentState}
              stats={stats}
              speed={speed}
              showIpa={showIpa}
              notice={notice}
              recorder={recorder}
              dictation={dictation}
              onStartDictation={startDictation}
              recordingBusy={recordingBusy}
              canGoPrevious={historyPosition > 0 && !recordingBusy}
              onToggleIpa={() => setShowIpa((value) => !value)}
              onSpeak={playDemo}
              onToggleSpeed={() => {
                setSpeed((value) => (value === 'normal' ? 'slow' : 'normal'));
                setNotice('');
              }}
              onRecord={handleRecorder}
              onToggleFlag={toggleFlag}
              onNext={nextSentence}
              onPrevious={previousSentence}
              onChooseRelated={display}
              onDismissNotice={() => setNotice('')}
            />
          ) : view === 'settings' ? (
            <SettingsView
              speed={speed}
              showIpa={showIpa}
              appearance={appearance}
              languageSetting={languageSetting}
              onChangeLanguage={onChangeLanguage}
              onChangeAppearance={changeAppearance}
              onToggleSpeed={() => setSpeed((value) => (value === 'normal' ? 'slow' : 'normal'))}
              onToggleIpa={() => setShowIpa((value) => !value)}
              onBackToPractice={() => nav('practice')}
            />
          ) : (
            <LibraryView key={view}
              view={view}
              states={states}
              events={events}
              search={search}
              notice={notice}
              onSearch={setSearch}
              onChoose={chooseFromLibrary}
              onBackToPractice={() => nav('practice')}
            />
          )}
        </main>
      </div>
      </div>
      {/* The compact viewport has its own navigation affordance; no miniature sidebar. */}
      <nav className="mobileNav fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 gap-1 border-t border-border/80 bg-card/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-soft backdrop-blur-xl sm:hidden" aria-label={t('navLabel')}>
        {menu.map(({id,icon:Icon}) => (
          <Button key={id} variant="ghost" className={cn('mobileNavItem h-14 min-w-0 flex-col gap-1 rounded-xl px-1 py-1 text-[10px] transition-[background-color,color,transform] duration-200 motion-safe:active:scale-[.94]',view===id&&'bg-secondary text-primary')} aria-label={t(({practice:'navStart',favorites:'navMyFavorites',history:'navRecent',review:'navReviewItems',settings:'navSettings'} as const)[id])+' · '+t('navLabel')} aria-current={view===id?'page':undefined} onClick={() => nav(id)}>
            <Icon size={19} strokeWidth={1.9} aria-hidden="true"/>
            <span className="max-w-full truncate">{t(({practice:'navPractice',favorites:'navFavorites',history:'navHistory',review:'navReview',settings:'navSettings'} as const)[id])}</span>
          </Button>
        ))}
      </nav>
    </div>
  );
}
