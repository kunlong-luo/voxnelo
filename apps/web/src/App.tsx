import { useCallback, useEffect, useMemo, useState } from 'react';
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
  const current = useMemo(() => SENTENCES.find((item) => item.id === sentenceId) ?? FIRST_SENTENCE, [sentenceId]);
  const recordingBusy = recorder.status === 'requesting' || recorder.status === 'recording';
  const notify = useCallback((message: string) => setNotice(message), []);
  const { states, events, setFlag } = useLearningData(notify, sentenceId, current.id, recorder.recordingUrl);
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
    if (recorder.status === 'recording') {
      recorder.stop();
    } else {
      // 示范音与录音不可重叠，防止把扬声器输出录为自己的跟读。
      silence();
      void recorder.start();
    }
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
      <DesktopTitlebar />
      <div className={cn("shell flex min-h-dvh items-stretch",window.voxneloDesktop?.windowControls&&"min-h-[calc(100dvh-44px)]")}>
      <aside className={cn("sidebar sticky top-0 hidden h-dvh w-[clamp(204px,19vw,252px)] shrink-0 flex-col overflow-y-auto border-r border-border/70 bg-sidebar px-3 py-7 text-sidebar-foreground sm:flex max-[1050px]:w-19 max-[1050px]:items-center max-[1050px]:px-2", window.voxneloDesktop?.windowControls && "top-11 h-[calc(100dvh-44px)]")}>
        <div className="brand mb-8 flex w-full items-center gap-3 px-2 max-[1050px]:justify-center max-[1050px]:px-0" aria-label="Voxnelo">
          <div className="brandMark flex size-11 shrink-0 items-center justify-center"><img src="brand/voxnelo-mark.svg" alt="" width="44" height="44" className="size-11 rounded-2xl shadow-sm"/></div>
          <div className="brandText max-[1050px]:hidden"><strong className="text-[24px] font-extrabold tracking-[-.065em] text-foreground">Voxnelo</strong></div>
        </div>
        <div className="sidebarHint px-4 text-[10px] font-bold tracking-[.18em] text-muted-foreground uppercase max-[1050px]:hidden">{t('sidebarSpace')}</div>
        <nav className="mt-4 flex w-full flex-col gap-1.5" aria-label={t('navLabel')}>
          {menu.map(({ id, icon: Icon }) => (
            <Button key={id} variant="ghost" className={cn('navItem group h-12 w-full justify-start rounded-2xl px-4 text-sm font-semibold text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-foreground max-[1050px]:size-12 max-[1050px]:justify-center max-[1050px]:px-0',view===id&&'active bg-card/85 text-primary shadow-sm ring-1 ring-border/40')} aria-label={t(({practice:'navStart',favorites:'navMyFavorites',history:'navRecent',review:'navReviewItems',settings:'navSettings'} as const)[id])} aria-current={view === id ? 'page' : undefined} onClick={() => nav(id)}>
              <Icon size={20} strokeWidth={1.9} />
              <span className="max-[1050px]:hidden">{t(({practice:'navPractice',favorites:'navFavorites',history:'navHistory',review:'navReview',settings:'navSettings'} as const)[id])}</span>
              {id === 'favorites' && stats.favorites > 0 ? <span className="navCount ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground max-[1050px]:hidden">{stats.favorites}</span> : null}
            </Button>
          ))}
        </nav>
        <div className="sidebarBottom mt-auto flex flex-col gap-4 px-2 pt-8 max-[1050px]:hidden">
          <div className="tinyPanel privacyPanel flex flex-col gap-2 rounded-2xl border border-border/70 bg-card/55 p-4 text-xs leading-5 text-muted-foreground">
            <span className="tinyBadge flex size-9 items-center justify-center rounded-xl bg-secondary text-primary"><ShieldCheck size={17} /></span>
            <strong>{t('sidebarRhythm')}</strong>
            <span>{t('sidebarLocal')}</span>
          </div>
          <div className="sidebarVersion px-1 text-[10px] text-muted-foreground">Voxnelo · Early Access {APP_VERSION}</div>
        </div>
      </aside>
      <div className="mainArea @container/workspace relative min-w-0 flex-1 bg-gradient-to-br from-background via-brand-cream/45 to-brand-mist/35">
        {recorder.status === 'recording' ? (
          <Button variant="destructive" className="recordingQuickStop fixed right-4 bottom-24 z-60 shadow-xl sm:right-6 sm:bottom-6" onClick={handleRecorder}
            aria-label={t("stopFloating")}><Square size={15} fill="currentColor" aria-hidden="true" /> {t("stopRecording")}</Button>
        ) : null}
        <main className="content mx-auto w-full max-w-400 px-3 pt-4 pb-25 sm:px-5 sm:py-6 xl:px-8">
          {view === 'practice' ? (
            <PracticeView
              current={current}
              currentState={currentState}
              stats={stats}
              speed={speed}
              showIpa={showIpa}
              notice={notice}
              recorder={recorder}
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
            <LibraryView
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
          <Button key={id} variant="ghost" className={cn('mobileNavItem h-14 min-w-0 flex-col gap-1 rounded-xl px-1 py-1 text-[10px]',view===id&&'bg-secondary text-primary')} aria-label={t(({practice:'navStart',favorites:'navMyFavorites',history:'navRecent',review:'navReviewItems',settings:'navSettings'} as const)[id])+' · '+t('navLabel')} aria-current={view===id?'page':undefined} onClick={() => nav(id)}>
            <Icon size={19} strokeWidth={1.9} aria-hidden="true"/>
            <span className="max-w-full truncate">{t(({practice:'navPractice',favorites:'navFavorites',history:'navHistory',review:'navReview',settings:'navSettings'} as const)[id])}</span>
          </Button>
        ))}
      </nav>
    </div>
  );
}
